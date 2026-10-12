use chrono::{DateTime, NaiveDate, Utc};
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::module::dating::model::*;
use crate::module::push::PushService;
use crate::module::storage::StorageService;
use crate::DbPool;

pub const GENDERS: &[&str] = &["woman", "man", "nonbinary", "other"];
pub const INTENTS: &[&str] = &["friends", "partner", "both"];
pub const MAX_PHOTOS: i64 = 6;

pub struct DatingService {
    pool: DbPool,
    storage: Arc<StorageService>,
    push: Arc<PushService>,
    ws: Option<Arc<crate::module::ws::WsBroadcaster>>,
}

/// Public-profile projection relative to viewer `$1` (CTE `me`).
/// Callers append their own WHERE / ORDER / LIMIT after `{extra}`.
fn public_select(extra_where: &str) -> String {
    format!(
        r#"
        WITH me AS (SELECT * FROM dating.profiles WHERE user_id = $1)
        SELECT p.user_id, p.display_name,
               date_part('year', age(p.birthday))::int AS age,
               p.gender, p.city, p.about, p.interests, p.intent,
               CASE WHEN me.lat IS NOT NULL AND me.lng IS NOT NULL
                     AND p.lat IS NOT NULL AND p.lng IS NOT NULL
                    THEN 6371.0 * acos(least(1.0, greatest(-1.0,
                          cos(radians(me.lat)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(me.lng))
                        + sin(radians(me.lat)) * sin(radians(p.lat)))))
               END AS distance_km,
               p.last_active_at, p.created_at
        FROM dating.profiles p
        LEFT JOIN me ON TRUE
        WHERE p.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM dating.blocks b
            WHERE (b.blocker_id = $1 AND b.blocked_id = p.user_id)
               OR (b.blocker_id = p.user_id AND b.blocked_id = $1)
          )
          {extra_where}
        "#
    )
}

pub fn match_percent(
    mine: &[String],
    theirs: &[String],
    my_intent: &str,
    their_intent: &str,
) -> i32 {
    let shared = mine.iter().filter(|i| theirs.contains(i)).count() as f64;
    let mut union: Vec<&String> = mine.iter().collect();
    for t in theirs {
        if !union.contains(&t) {
            union.push(t);
        }
    }
    let union = union.len().max(1) as f64;
    let mut score = 52.0 + (shared / union) * 42.0;
    if my_intent == their_intent || my_intent == "both" || their_intent == "both" {
        score += 5.0;
    }
    score.round().clamp(40.0, 99.0) as i32
}

fn parse_birthday(s: &str) -> AppResult<NaiveDate> {
    let d = NaiveDate::parse_from_str(s.trim(), "%Y-%m-%d")
        .map_err(|_| AppError::bad_request("birthday must be YYYY-MM-DD"))?;
    let age = Utc::now().date_naive().years_since(d).unwrap_or(0);
    if age < 18 {
        return Err(AppError::bad_request("You must be 18 or older"));
    }
    if age > 100 {
        return Err(AppError::bad_request("Enter a valid birth date"));
    }
    Ok(d)
}

fn parse_ts(s: Option<&str>) -> Option<DateTime<Utc>> {
    s.and_then(|v| DateTime::parse_from_rfc3339(v).ok())
        .map(|d| d.with_timezone(&Utc))
}

impl DatingService {
    pub fn new(
        pool: DbPool,
        storage: Arc<StorageService>,
        push: Arc<PushService>,
        ws: Option<Arc<crate::module::ws::WsBroadcaster>>,
    ) -> Self {
        Self {
            pool,
            storage,
            push,
            ws,
        }
    }

    // -----------------------------------------------------------------------
    // Profile helpers
    // -----------------------------------------------------------------------

    pub async fn ensure_profile(&self, user_id: Uuid) -> AppResult<()> {
        sqlx::query(
            r#"
            INSERT INTO dating.profiles (user_id, display_name, birthday)
            SELECT u.id, u.name, u.birthday FROM auth.users u WHERE u.id = $1
            ON CONFLICT (user_id) DO NOTHING
            "#,
        )
        .bind(user_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn touch(&self, user_id: Uuid) {
        let _ = sqlx::query(
            r#"UPDATE dating.profiles SET last_active_at = NOW()
               WHERE user_id = $1 AND last_active_at < NOW() - interval '2 minutes'"#,
        )
        .bind(user_id)
        .execute(&self.pool)
        .await;
    }

    /// All photos of one user, ordered by position.
    async fn my_photos(&self, user_id: Uuid) -> AppResult<Vec<PhotoJson>> {
        Ok(self
            .photos_for(&[user_id])
            .await?
            .remove(&user_id)
            .unwrap_or_default())
    }

    async fn photos_for(&self, ids: &[Uuid]) -> AppResult<HashMap<Uuid, Vec<PhotoJson>>> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }
        let rows = sqlx::query_as::<_, PhotoRow>(
            r#"SELECT id, user_id, url, storage_key, position FROM dating.photos
               WHERE user_id = ANY($1) ORDER BY user_id, position, created_at"#,
        )
        .bind(ids)
        .fetch_all(&self.pool)
        .await?;
        let mut map: HashMap<Uuid, Vec<PhotoJson>> = HashMap::new();
        for r in rows {
            map.entry(r.user_id).or_default().push(r.into());
        }
        Ok(map)
    }

    async fn my_interests(&self, user_id: Uuid) -> AppResult<(Vec<String>, String)> {
        let row: Option<(Vec<String>, String)> =
            sqlx::query_as("SELECT interests, intent FROM dating.profiles WHERE user_id = $1")
                .bind(user_id)
                .fetch_optional(&self.pool)
                .await?;
        Ok(row.unwrap_or((vec![], "both".into())))
    }

    async fn to_public(
        &self,
        viewer: Uuid,
        rows: Vec<PublicProfileRow>,
    ) -> AppResult<Vec<PublicProfileJson>> {
        let ids: Vec<Uuid> = rows.iter().map(|r| r.user_id).collect();
        let mut photos = self.photos_for(&ids).await?;
        let (mine, my_intent) = self.my_interests(viewer).await?;
        Ok(rows
            .into_iter()
            .map(|r| {
                let pct = match_percent(&mine, &r.interests, &my_intent, &r.intent);
                let ph = photos.remove(&r.user_id).unwrap_or_default();
                PublicProfileJson::from_row(r, ph, pct)
            })
            .collect())
    }

    pub async fn public_profiles(
        &self,
        viewer: Uuid,
        ids: &[Uuid],
    ) -> AppResult<Vec<PublicProfileJson>> {
        if ids.is_empty() {
            return Ok(vec![]);
        }
        let sql = public_select("AND p.user_id = ANY($2)");
        let rows = sqlx::query_as::<_, PublicProfileRow>(&sql)
            .bind(viewer)
            .bind(ids)
            .fetch_all(&self.pool)
            .await?;
        self.to_public(viewer, rows).await
    }

    // -----------------------------------------------------------------------
    // My profile
    // -----------------------------------------------------------------------

    pub async fn get_profile(&self, user_id: Uuid) -> AppResult<MyProfileJson> {
        self.ensure_profile(user_id).await?;
        self.touch(user_id).await;
        let row = sqlx::query_as::<_, MyProfileRow>(
            r#"
            SELECT p.user_id, p.display_name, p.gender, p.looking_for, p.intent, p.birthday,
                   date_part('year', age(p.birthday))::int AS age,
                   p.city, p.country, p.about, p.interests, p.lat, p.lng,
                   p.min_age, p.max_age, p.max_distance_km, p.onboarding_complete,
                   u.email, u.phone, (u.password_hash IS NOT NULL) AS has_password
            FROM dating.profiles p JOIN auth.users u ON u.id = p.user_id
            WHERE p.user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::not_found("Profile not found"))?;
        let photos = self
            .photos_for(&[user_id])
            .await?
            .remove(&user_id)
            .unwrap_or_default();
        Ok(MyProfileJson::from_row(row, photos))
    }

    pub async fn patch_profile(
        &self,
        user_id: Uuid,
        req: PatchProfileRequest,
    ) -> AppResult<MyProfileJson> {
        self.ensure_profile(user_id).await?;

        if let Some(n) = &req.display_name {
            let n = n.trim();
            if n.is_empty() || n.chars().count() > 40 {
                return Err(AppError::bad_request("Name must be 1–40 characters"));
            }
        }
        if let Some(g) = &req.gender {
            if !GENDERS.contains(&g.as_str()) {
                return Err(AppError::bad_request("Invalid gender"));
            }
        }
        if let Some(lf) = &req.looking_for {
            if lf.iter().any(|g| !GENDERS.contains(&g.as_str())) {
                return Err(AppError::bad_request("Invalid looking_for value"));
            }
        }
        if let Some(i) = &req.intent {
            if !INTENTS.contains(&i.as_str()) {
                return Err(AppError::bad_request("Invalid intent"));
            }
        }
        if let Some(a) = &req.about {
            if a.trim().chars().count() > 100 {
                return Err(AppError::bad_request("About must be 100 characters or fewer"));
            }
        }
        let birthday = match req
            .birthday
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            Some(s) => Some(parse_birthday(s)?),
            None => None,
        };
        if let (Some(min), Some(max)) = (req.min_age, req.max_age) {
            if min < 18 || max < min || max > 100 {
                return Err(AppError::bad_request("Invalid age range"));
            }
        }
        if let Some(d) = req.max_distance_km {
            if !(1..=1000).contains(&d) {
                return Err(AppError::bad_request("Distance must be 1–1000 km"));
            }
        }

        sqlx::query(
            r#"
            UPDATE dating.profiles SET
              display_name    = COALESCE($2, display_name),
              gender          = COALESCE($3, gender),
              looking_for     = COALESCE($4, looking_for),
              intent          = COALESCE($5, intent),
              birthday        = COALESCE($6, birthday),
              city            = COALESCE($7, city),
              country         = COALESCE($8, country),
              about           = COALESCE($9, about),
              interests       = COALESCE($10, interests),
              min_age         = COALESCE($11, min_age),
              max_age         = COALESCE($12, max_age),
              max_distance_km = COALESCE($13, max_distance_km),
              lat             = COALESCE($14, lat),
              lng             = COALESCE($15, lng),
              updated_at      = NOW()
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .bind(req.display_name.as_deref().map(str::trim))
        .bind(req.gender.as_deref())
        .bind(req.looking_for.as_ref())
        .bind(req.intent.as_deref())
        .bind(birthday)
        .bind(req.city.as_deref().map(str::trim))
        .bind(req.country.as_deref().map(str::trim))
        .bind(req.about.as_deref().map(str::trim))
        .bind(req.interests.as_ref())
        .bind(req.min_age)
        .bind(req.max_age)
        .bind(req.max_distance_km)
        .bind(req.lat)
        .bind(req.lng)
        .execute(&self.pool)
        .await?;

        // Keep auth.users.name / birthday in sync for emails and age checks.
        sqlx::query(
            r#"UPDATE auth.users u SET name = p.display_name, birthday = p.birthday, updated_at = NOW()
               FROM dating.profiles p WHERE p.user_id = u.id AND u.id = $1"#,
        )
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        if req.complete_onboarding == Some(true) {
            let ok: bool = sqlx::query_scalar(
                r#"SELECT display_name <> '' AND gender IS NOT NULL AND birthday IS NOT NULL
                          AND cardinality(looking_for) > 0
                   FROM dating.profiles WHERE user_id = $1"#,
            )
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?;
            if !ok {
                return Err(AppError::bad_request(
                    "Add your name, birthday, gender and who you want to meet to finish",
                ));
            }
            sqlx::query("UPDATE dating.profiles SET onboarding_complete = TRUE WHERE user_id = $1")
                .bind(user_id)
                .execute(&self.pool)
                .await?;
        }

        self.get_profile(user_id).await
    }

    pub async fn set_location(
        &self,
        user_id: Uuid,
        req: LocationRequest,
    ) -> AppResult<MyProfileJson> {
        if !(-90.0..=90.0).contains(&req.lat) || !(-180.0..=180.0).contains(&req.lng) {
            return Err(AppError::bad_request("Invalid coordinates"));
        }
        self.ensure_profile(user_id).await?;
        sqlx::query(
            r#"UPDATE dating.profiles SET lat = $2, lng = $3,
                 city = COALESCE(NULLIF($4, ''), city), updated_at = NOW()
               WHERE user_id = $1"#,
        )
        .bind(user_id)
        .bind(req.lat)
        .bind(req.lng)
        .bind(req.city.as_deref().map(str::trim))
        .execute(&self.pool)
        .await?;
        self.get_profile(user_id).await
    }

    // -----------------------------------------------------------------------
    // Photos
    // -----------------------------------------------------------------------

    pub async fn add_photo(&self, user_id: Uuid, bytes: &[u8]) -> AppResult<Vec<PhotoJson>> {
        self.ensure_profile(user_id).await?;
        let count: i64 =
            sqlx::query_scalar("SELECT count(*) FROM dating.photos WHERE user_id = $1")
                .bind(user_id)
                .fetch_one(&self.pool)
                .await?;
        if count >= MAX_PHOTOS {
            return Err(AppError::bad_request(format!(
                "Maximum {MAX_PHOTOS} photos"
            )));
        }
        let stored = self.storage.put_photo(&user_id.to_string(), bytes).await?;
        sqlx::query(
            r#"INSERT INTO dating.photos (user_id, url, storage_key, position)
               VALUES ($1, $2, $3, $4)"#,
        )
        .bind(user_id)
        .bind(&stored.url)
        .bind(&stored.key)
        .bind(count as i32)
        .execute(&self.pool)
        .await?;
        self.my_photos(user_id).await
    }

    pub async fn delete_photo(&self, user_id: Uuid, photo_id: &str) -> AppResult<Vec<PhotoJson>> {
        let pid =
            Uuid::parse_str(photo_id).map_err(|_| AppError::bad_request("Invalid photo id"))?;
        let key: Option<Option<String>> = sqlx::query_scalar(
            "DELETE FROM dating.photos WHERE id = $1 AND user_id = $2 RETURNING storage_key",
        )
        .bind(pid)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;
        let Some(key) = key else {
            return Err(AppError::not_found("Photo not found"));
        };
        if let Some(k) = key {
            self.storage.delete(&k).await;
        }
        // Re-pack positions
        sqlx::query(
            r#"WITH ranked AS (
                 SELECT id, row_number() OVER (ORDER BY position, created_at) - 1 AS rn
                 FROM dating.photos WHERE user_id = $1)
               UPDATE dating.photos p SET position = r.rn FROM ranked r WHERE r.id = p.id"#,
        )
        .bind(user_id)
        .execute(&self.pool)
        .await?;
        self.my_photos(user_id).await
    }

    pub async fn reorder_photos(
        &self,
        user_id: Uuid,
        ids: Vec<String>,
    ) -> AppResult<Vec<PhotoJson>> {
        for (i, id) in ids.iter().enumerate() {
            let pid = Uuid::parse_str(id).map_err(|_| AppError::bad_request("Invalid photo id"))?;
            sqlx::query("UPDATE dating.photos SET position = $3 WHERE id = $1 AND user_id = $2")
                .bind(pid)
                .bind(user_id)
                .bind(i as i32)
                .execute(&self.pool)
                .await?;
        }
        self.my_photos(user_id).await
    }

    // -----------------------------------------------------------------------
    // Discover
    // -----------------------------------------------------------------------

    pub async fn nearby(
        &self,
        user_id: Uuid,
        q: DiscoverQuery,
    ) -> AppResult<Vec<PublicProfileJson>> {
        self.ensure_profile(user_id).await?;
        self.touch(user_id).await;
        let interest = q
            .interest
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            // Chips carry an emoji prefix ("🎵 Music") — match on the word part.
            .map(|s| s.split_whitespace().last().unwrap_or(s).to_string());
        let limit = q.limit.unwrap_or(20).clamp(1, 50);
        let offset = q.offset.unwrap_or(0).max(0);
        // Browsing mode. When given, show people open to it (their intent is that mode or
        // "both"); otherwise fall back to the viewer's own onboarding intent.
        let intent = q
            .intent
            .as_deref()
            .map(str::trim)
            .filter(|s| *s == "friends" || *s == "partner")
            .map(str::to_string);

        let city = q
            .city
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(str::to_string);

        let inner = public_select(
            r#"
            AND p.user_id <> $1
            AND p.onboarding_complete
            AND NOT EXISTS (SELECT 1 FROM dating.swipes s WHERE s.from_user_id = $1 AND s.to_user_id = p.user_id)
            AND CASE WHEN $6::text = 'friends' THEN TRUE
                     ELSE (me.looking_for IS NULL OR cardinality(me.looking_for) = 0 OR p.gender IS NULL OR p.gender = ANY(me.looking_for))
                END
            AND CASE WHEN $6::text = 'friends' THEN TRUE
                     ELSE (cardinality(p.looking_for) = 0 OR me.gender IS NULL OR me.gender = ANY(p.looking_for))
                END
            AND CASE WHEN $6::text IS NOT NULL
                     THEN (p.intent = 'both' OR p.intent = $6)
                     ELSE (me.intent IS NULL OR me.intent = 'both' OR p.intent = 'both' OR p.intent = me.intent)
                END
            AND (p.birthday IS NULL OR date_part('year', age(p.birthday)) BETWEEN COALESCE(me.min_age, 18) AND COALESCE(me.max_age, 100))
            AND ($2::text IS NULL OR EXISTS (SELECT 1 FROM unnest(p.interests) i WHERE i ILIKE '%' || $2 || '%'))
            AND ($7::text IS NULL OR p.city ILIKE '%' || $7 || '%')
            "#,
        );
        let sql = format!(
            r#"SELECT * FROM ({inner}) q
               WHERE ($3::int IS NULL OR q.distance_km IS NULL OR q.distance_km <= $3)
               ORDER BY q.distance_km NULLS LAST, q.last_active_at DESC
               LIMIT $4 OFFSET $5"#
        );
        let rows = sqlx::query_as::<_, PublicProfileRow>(&sql)
            .bind(user_id)
            .bind(interest)
            .bind(q.max_km)
            .bind(limit)
            .bind(offset)
            .bind(intent)
            .bind(city)
            .fetch_all(&self.pool)
            .await?;
        self.to_public(user_id, rows).await
    }

    pub async fn person(&self, viewer: Uuid, id: &str) -> AppResult<PublicProfileJson> {
        let uid = Uuid::parse_str(id).map_err(|_| AppError::bad_request("Invalid id"))?;
        self.public_profiles(viewer, &[uid])
            .await?
            .pop()
            .ok_or_else(|| AppError::not_found("Person not found"))
    }

    pub async fn stories(&self, user_id: Uuid) -> AppResult<Vec<StoryJson>> {
        self.ensure_profile(user_id).await?;
        let sql = public_select(
            r#"AND p.user_id <> $1 AND p.onboarding_complete
               AND EXISTS (SELECT 1 FROM dating.photos ph WHERE ph.user_id = p.user_id)
               AND EXISTS (
                   SELECT 1 FROM dating.matches m
                   WHERE m.unmatched_at IS NULL
                     AND (
                       (m.user_a = $1 AND m.user_b = p.user_id)
                       OR (m.user_a = p.user_id AND m.user_b = $1)
                     )
               )"#,
        ) + " ORDER BY p.last_active_at DESC LIMIT 12";
        let rows = sqlx::query_as::<_, PublicProfileRow>(&sql)
            .bind(user_id)
            .fetch_all(&self.pool)
            .await?;
        let mut ids: Vec<Uuid> = rows.iter().map(|r| r.user_id).collect();
        ids.push(user_id);
        let mut photos = self.photos_for(&ids).await?;
        let my_name: String =
            sqlx::query_scalar("SELECT display_name FROM dating.profiles WHERE user_id = $1")
                .bind(user_id)
                .fetch_optional(&self.pool)
                .await?
                .unwrap_or_else(|| "You".into());
        let mut out = vec![StoryJson {
            id: user_id.to_string(),
            name: my_name,
            photo_url: photos
                .remove(&user_id)
                .and_then(|v| v.first().map(|p| p.url.clone())),
            is_self: Some(true),
        }];
        for r in rows {
            out.push(StoryJson {
                id: r.user_id.to_string(),
                name: r
                    .display_name
                    .split_whitespace()
                    .next()
                    .unwrap_or("")
                    .to_string(),
                photo_url: photos
                    .remove(&r.user_id)
                    .and_then(|v| v.first().map(|p| p.url.clone())),
                is_self: None,
            });
        }
        Ok(out)
    }

    // -----------------------------------------------------------------------
    // Swipe → match
    // -----------------------------------------------------------------------

    pub async fn swipe(
        &self,
        user_id: Uuid,
        target: &str,
        action: &str,
        mode: Option<&str>,
    ) -> AppResult<SwipeResponse> {
        let action = action.trim().to_lowercase();
        if !["like", "pass", "superlike"].contains(&action.as_str()) {
            return Err(AppError::bad_request(
                "action must be like, pass or superlike",
            ));
        }
        let mode = mode
            .map(str::trim)
            .filter(|m| *m == "friends" || *m == "partner");
        let friends_mode = mode == Some("friends");
        let target_id =
            Uuid::parse_str(target).map_err(|_| AppError::bad_request("Invalid target_id"))?;
        if target_id == user_id {
            return Err(AppError::bad_request("Cannot swipe yourself"));
        }
        self.ensure_profile(user_id).await?;

        // Target must be visible to us (exists, not blocked either way).
        let visible = self.public_profiles(user_id, &[target_id]).await?;
        let Some(person) = visible.into_iter().next() else {
            return Err(AppError::not_found("Person not found"));
        };

        sqlx::query(
            r#"INSERT INTO dating.swipes (from_user_id, to_user_id, action, mode)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (from_user_id, to_user_id) DO UPDATE
                 SET action = EXCLUDED.action, mode = COALESCE(EXCLUDED.mode, dating.swipes.mode), created_at = NOW()"#,
        )
        .bind(user_id)
        .bind(target_id)
        .bind(&action)
        .bind(mode)
        .execute(&self.pool)
        .await?;

        if action == "pass" {
            return Ok(SwipeResponse {
                matched: false,
                match_id: None,
                conversation_id: None,
                person: None,
            });
        }

        let reciprocal: bool = sqlx::query_scalar(
            r#"SELECT EXISTS(SELECT 1 FROM dating.swipes
                             WHERE from_user_id = $2 AND to_user_id = $1 AND action <> 'pass')"#,
        )
        .bind(user_id)
        .bind(target_id)
        .fetch_one(&self.pool)
        .await?;

        if !reciprocal {
            // Let them know someone liked them (no identity in the push body).
            self.push.notify(
                target_id,
                if friends_mode {
                    "Someone wants to connect 👋".into()
                } else {
                    "Someone likes you 💜".into()
                },
                "Open Palora to see who.".into(),
                serde_json::json!({ "type": "like", "mode": mode }),
            );
            return Ok(SwipeResponse {
                matched: false,
                match_id: None,
                conversation_id: None,
                person: None,
            });
        }

        let (a, b) = if user_id < target_id {
            (user_id, target_id)
        } else {
            (target_id, user_id)
        };
        let match_id: Uuid = sqlx::query_scalar(
            r#"INSERT INTO dating.matches (user_a, user_b)
               VALUES ($1, $2)
               ON CONFLICT (user_a, user_b) DO UPDATE
                 SET unmatched_at = NULL, unmatched_by = NULL, created_at = NOW()
               RETURNING id"#,
        )
        .bind(a)
        .bind(b)
        .fetch_one(&self.pool)
        .await?;

        let conversation_id: Uuid = sqlx::query_scalar(
            r#"INSERT INTO dating.conversations (match_id, user_a, user_b, last_preview)
               VALUES ($1, $2, $3, 'You matched! Say hi 👋')
               ON CONFLICT (match_id) DO UPDATE SET last_message_at = dating.conversations.last_message_at
               RETURNING id"#,
        )
        .bind(match_id)
        .bind(a)
        .bind(b)
        .fetch_one(&self.pool)
        .await?;

        let my_name: String =
            sqlx::query_scalar("SELECT display_name FROM dating.profiles WHERE user_id = $1")
                .bind(user_id)
                .fetch_one(&self.pool)
                .await
                .unwrap_or_else(|_| "Someone".into());
        let first = my_name.split_whitespace().next().unwrap_or("someone");
        let (title, body) = if friends_mode {
            (
                "You’re connected! 🎉".to_string(),
                format!("You and {first} both want to be friends."),
            )
        } else {
            (
                "It’s a match! 💞".to_string(),
                format!("You and {first} liked each other."),
            )
        };
        self.push.notify(
            target_id,
            title,
            body,
            serde_json::json!({ "type": "match", "mode": mode, "matchId": match_id, "conversationId": conversation_id }),
        );

        Ok(SwipeResponse {
            matched: true,
            match_id: Some(match_id.to_string()),
            conversation_id: Some(conversation_id.to_string()),
            person: Some(person),
        })
    }

    pub async fn likes(&self, user_id: Uuid) -> AppResult<LikesSummary> {
        #[derive(sqlx::FromRow)]
        struct Row {
            from_user_id: Uuid,
        }
        let rows = sqlx::query_as::<_, Row>(
            r#"
            SELECT s.from_user_id
            FROM dating.swipes s
            WHERE s.to_user_id = $1 AND s.action <> 'pass'
              AND NOT EXISTS (SELECT 1 FROM dating.swipes r WHERE r.from_user_id = $1 AND r.to_user_id = s.from_user_id)
              AND NOT EXISTS (SELECT 1 FROM dating.blocks b
                              WHERE (b.blocker_id = $1 AND b.blocked_id = s.from_user_id)
                                 OR (b.blocker_id = s.from_user_id AND b.blocked_id = $1))
            ORDER BY s.created_at DESC
            LIMIT 50
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;
        let ids: Vec<Uuid> = rows.iter().map(|r| r.from_user_id).collect();
        let matches: i64 = sqlx::query_scalar(
            "SELECT count(*) FROM dating.matches WHERE (user_a = $1 OR user_b = $1) AND unmatched_at IS NULL",
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;
        let people = self.public_profiles(user_id, &ids).await?;
        Ok(LikesSummary {
            received: ids.len() as i64,
            matches,
            people,
        })
    }

    pub async fn matches(&self, user_id: Uuid) -> AppResult<Vec<MatchJson>> {
        #[derive(sqlx::FromRow)]
        struct Row {
            id: Uuid,
            conversation_id: Uuid,
            peer: Uuid,
            created_at: DateTime<Utc>,
        }
        let rows = sqlx::query_as::<_, Row>(
            r#"
            SELECT m.id, c.id AS conversation_id,
                   CASE WHEN m.user_a = $1 THEN m.user_b ELSE m.user_a END AS peer,
                   m.created_at
            FROM dating.matches m
            JOIN dating.conversations c ON c.match_id = m.id
            WHERE (m.user_a = $1 OR m.user_b = $1) AND m.unmatched_at IS NULL
            ORDER BY m.created_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;
        let ids: Vec<Uuid> = rows.iter().map(|r| r.peer).collect();
        let people = self.public_profiles(user_id, &ids).await?;
        let by_id: HashMap<String, PublicProfileJson> =
            people.into_iter().map(|p| (p.id.clone(), p)).collect();
        Ok(rows
            .into_iter()
            .filter_map(|r| {
                by_id.get(&r.peer.to_string()).map(|p| MatchJson {
                    id: r.id.to_string(),
                    conversation_id: r.conversation_id.to_string(),
                    person: p.clone(),
                    created_at: r.created_at.to_rfc3339(),
                })
            })
            .collect())
    }

    pub async fn unmatch(&self, user_id: Uuid, match_id: &str) -> AppResult<OkResponse> {
        let mid =
            Uuid::parse_str(match_id).map_err(|_| AppError::bad_request("Invalid match id"))?;
        let n = sqlx::query(
            r#"UPDATE dating.matches SET unmatched_at = NOW(), unmatched_by = $2
               WHERE id = $1 AND (user_a = $2 OR user_b = $2) AND unmatched_at IS NULL"#,
        )
        .bind(mid)
        .bind(user_id)
        .execute(&self.pool)
        .await?
        .rows_affected();
        if n == 0 {
            return Err(AppError::not_found("Match not found"));
        }
        // Prevent re-showing in the deck: record a pass both ways is too strong;
        // just remove our like so they can reappear later if desired.
        sqlx::query(
            r#"UPDATE dating.swipes SET action = 'pass'
               WHERE from_user_id = $1 AND to_user_id = (
                 SELECT CASE WHEN user_a = $1 THEN user_b ELSE user_a END FROM dating.matches WHERE id = $2)"#,
        )
        .bind(user_id)
        .bind(mid)
        .execute(&self.pool)
        .await?;
        Ok(OkResponse { ok: true })
    }

    // -----------------------------------------------------------------------
    // Chat
    // -----------------------------------------------------------------------

    async fn conversation_peer(&self, user_id: Uuid, conversation_id: Uuid) -> AppResult<Uuid> {
        let row: Option<(Uuid, Uuid, Option<DateTime<Utc>>)> = sqlx::query_as(
            r#"SELECT c.user_a, c.user_b, m.unmatched_at
               FROM dating.conversations c JOIN dating.matches m ON m.id = c.match_id
               WHERE c.id = $1"#,
        )
        .bind(conversation_id)
        .fetch_optional(&self.pool)
        .await?;
        let Some((a, b, unmatched)) = row else {
            return Err(AppError::not_found("Conversation not found"));
        };
        if a != user_id && b != user_id {
            return Err(AppError::forbidden("Not your conversation"));
        }
        if unmatched.is_some() {
            return Err(AppError::forbidden("This match has ended"));
        }
        Ok(if a == user_id { b } else { a })
    }

    pub async fn conversations(&self, user_id: Uuid) -> AppResult<Vec<ConversationJson>> {
        let rows = sqlx::query_as::<_, ConversationRow>(
            r#"
            SELECT c.id, c.match_id,
                   CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END AS peer_id,
                   pr.display_name AS peer_name,
                   c.last_preview, c.last_message_at, c.last_sender_id, r.last_read_at
            FROM dating.conversations c
            JOIN dating.matches m ON m.id = c.match_id AND m.unmatched_at IS NULL
            JOIN dating.profiles pr ON pr.user_id = CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END
            LEFT JOIN dating.message_reads r ON r.conversation_id = c.id AND r.user_id = $1
            WHERE (c.user_a = $1 OR c.user_b = $1) AND pr.deleted_at IS NULL
            ORDER BY c.last_message_at DESC
            LIMIT 200
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;
        let ids: Vec<Uuid> = rows.iter().map(|r| r.peer_id).collect();
        let mut photos = self.photos_for(&ids).await?;
        Ok(rows
            .into_iter()
            .map(|r| {
                let unread = r.last_sender_id.is_some_and(|s| s != user_id)
                    && r.last_read_at.is_none_or(|t| t < r.last_message_at);
                ConversationJson {
                    id: r.id.to_string(),
                    match_id: r.match_id.to_string(),
                    peer_id: r.peer_id.to_string(),
                    name: r.peer_name,
                    photo_url: photos
                        .remove(&r.peer_id)
                        .and_then(|v| v.first().map(|p| p.url.clone())),
                    preview: r.last_preview,
                    time: r.last_message_at.format("%H:%M").to_string(),
                    last_message_at: r.last_message_at.to_rfc3339(),
                    unread: if unread { Some(true) } else { None },
                }
            })
            .collect())
    }

    pub async fn messages(
        &self,
        user_id: Uuid,
        conversation_id: &str,
        q: MessagesQuery,
    ) -> AppResult<Vec<MessageJson>> {
        let cid = Uuid::parse_str(conversation_id)
            .map_err(|_| AppError::bad_request("Invalid conversation id"))?;
        self.conversation_peer(user_id, cid).await?;
        let before = parse_ts(q.before.as_deref());
        let limit = q.limit.unwrap_or(50).clamp(1, 200);
        // Newest first: the client renders an inverted list and pages older
        // messages with `before = created_at` of the last item it has.
        let rows = sqlx::query_as::<_, MessageRow>(
            r#"SELECT id, sender_id, body, created_at FROM dating.messages
               WHERE conversation_id = $1 AND ($2::timestamptz IS NULL OR created_at < $2)
               ORDER BY created_at DESC LIMIT $3"#,
        )
        .bind(cid)
        .bind(before)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        if before.is_none() {
            sqlx::query(
                r#"INSERT INTO dating.message_reads (conversation_id, user_id, last_read_at)
                   VALUES ($1, $2, NOW())
                   ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_at = NOW()"#,
            )
            .bind(cid)
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        }

        Ok(rows
            .into_iter()
            .map(|r| MessageJson {
                id: r.id.to_string(),
                mine: r.sender_id == user_id,
                sender_id: r.sender_id.to_string(),
                body: r.body,
                created_at: r.created_at.to_rfc3339(),
            })
            .collect())
    }

    pub async fn send_message(
        &self,
        user_id: Uuid,
        conversation_id: &str,
        body: &str,
    ) -> AppResult<MessageJson> {
        let body = body.trim();
        if body.is_empty() {
            return Err(AppError::bad_request("Message body required"));
        }
        if body.chars().count() > 2000 {
            return Err(AppError::bad_request("Message too long"));
        }
        let cid = Uuid::parse_str(conversation_id)
            .map_err(|_| AppError::bad_request("Invalid conversation id"))?;
        let peer = self.conversation_peer(user_id, cid).await?;

        let row = sqlx::query_as::<_, MessageRow>(
            r#"INSERT INTO dating.messages (conversation_id, sender_id, body)
               VALUES ($1, $2, $3) RETURNING id, sender_id, body, created_at"#,
        )
        .bind(cid)
        .bind(user_id)
        .bind(body)
        .fetch_one(&self.pool)
        .await?;
        sqlx::query(
            r#"UPDATE dating.conversations
               SET last_preview = left($2, 120), last_message_at = $3, last_sender_id = $4
               WHERE id = $1"#,
        )
        .bind(cid)
        .bind(body)
        .bind(row.created_at)
        .bind(user_id)
        .execute(&self.pool)
        .await?;
        sqlx::query(
            r#"INSERT INTO dating.message_reads (conversation_id, user_id, last_read_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_at = NOW()"#,
        )
        .bind(cid)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        let my_name: String =
            sqlx::query_scalar("SELECT display_name FROM dating.profiles WHERE user_id = $1")
                .bind(user_id)
                .fetch_one(&self.pool)
                .await
                .unwrap_or_else(|_| "New message".into());
        let preview: String = body.chars().take(80).collect();
        self.push.notify(
            peer,
            my_name,
            preview,
            serde_json::json!({ "type": "message", "conversationId": cid }),
        );

        let msg_json = MessageJson {
            id: row.id.to_string(),
            sender_id: row.sender_id.to_string(),
            body: row.body,
            mine: true,
            created_at: row.created_at.to_rfc3339(),
        };

        if let Some(ref ws) = self.ws {
            let mut peer_msg = msg_json.clone();
            peer_msg.mine = false;
            let payload = serde_json::json!({
                "type": "new_message",
                "conversation_id": cid.to_string(),
                "message": peer_msg,
            })
            .to_string();
            let ws_clone = Arc::clone(ws);
            tokio::spawn(async move {
                ws_clone.send_to_user(peer, &payload).await;
            });
        }

        Ok(msg_json)
    }

    // -----------------------------------------------------------------------
    // Feed
    // -----------------------------------------------------------------------

    pub async fn feed(&self, user_id: Uuid, q: FeedQuery) -> AppResult<Vec<FeedPostJson>> {
        let mode = q
            .mode
            .as_deref()
            .filter(|m| *m == "friends" || *m == "partner");
        let cursor = parse_ts(q.cursor.as_deref());
        let limit = q.limit.unwrap_or(20).clamp(1, 50);
        let rows = sqlx::query_as::<_, FeedRow>(
            r#"
            SELECT f.id, f.author_id, pr.display_name AS author_name, pr.city AS author_city,
                   f.mode, f.category, f.question,
                   (SELECT count(*) FROM dating.post_likes l WHERE l.post_id = f.id) AS like_count,
                   (SELECT count(*) FROM dating.post_comments c WHERE c.post_id = f.id) AS comment_count,
                   EXISTS(SELECT 1 FROM dating.post_likes l WHERE l.post_id = f.id AND l.user_id = $1) AS liked_by_me,
                   (SELECT s.action FROM dating.swipes s
                     WHERE s.from_user_id = $1 AND s.to_user_id = f.author_id) AS my_swipe,
                   (SELECT c.id FROM dating.matches m
                     JOIN dating.conversations c ON c.match_id = m.id
                     WHERE m.unmatched_at IS NULL
                       AND ((m.user_a = $1 AND m.user_b = f.author_id) OR (m.user_a = f.author_id AND m.user_b = $1))
                     LIMIT 1) AS conversation_id,
                   f.created_at
            FROM dating.feed_posts f
            JOIN dating.profiles pr ON pr.user_id = f.author_id AND pr.deleted_at IS NULL
            WHERE ($2::text IS NULL OR f.mode = $2)
              AND ($3::timestamptz IS NULL OR f.created_at < $3)
              AND NOT EXISTS (SELECT 1 FROM dating.blocks b
                              WHERE (b.blocker_id = $1 AND b.blocked_id = f.author_id)
                                 OR (b.blocker_id = f.author_id AND b.blocked_id = $1))
            ORDER BY f.created_at DESC
            LIMIT $4
            "#,
        )
        .bind(user_id)
        .bind(mode)
        .bind(cursor)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;
        let ids: Vec<Uuid> = rows.iter().map(|r| r.author_id).collect();
        let photos = self.photos_for(&ids).await?;
        Ok(rows
            .into_iter()
            .map(|r| {
                let relation = if r.author_id == user_id {
                    "self"
                } else if r.conversation_id.is_some() {
                    "matched"
                } else if matches!(r.my_swipe.as_deref(), Some("like") | Some("superlike")) {
                    "liked"
                } else {
                    "none"
                };
                FeedPostJson {
                    id: r.id.to_string(),
                    category: r.category,
                    question: r.question,
                    mode: r.mode,
                    author: r.author_name,
                    author_id: r.author_id.to_string(),
                    city: r.author_city,
                    author_photo_url: photos
                        .get(&r.author_id)
                        .and_then(|v| v.first().map(|p| p.url.clone())),
                    like_count: r.like_count,
                    comment_count: r.comment_count,
                    liked_by_me: r.liked_by_me,
                    relation: relation.to_string(),
                    conversation_id: r.conversation_id.map(|c| c.to_string()),
                    created_at: r.created_at.to_rfc3339(),
                }
            })
            .collect())
    }

    pub async fn create_post(
        &self,
        user_id: Uuid,
        req: CreatePostRequest,
    ) -> AppResult<FeedPostJson> {
        let mode = req.mode.as_deref().unwrap_or("friends");
        if mode != "friends" && mode != "partner" {
            return Err(AppError::bad_request("mode must be friends or partner"));
        }
        let question = req.question.trim();
        let category = req.category.trim();
        if question.is_empty() || question.chars().count() > 280 {
            return Err(AppError::bad_request("Question must be 1–280 characters"));
        }
        if category.is_empty() || category.chars().count() > 40 {
            return Err(AppError::bad_request("Pick a category"));
        }
        self.ensure_profile(user_id).await?;
        let id: Uuid = sqlx::query_scalar(
            r#"INSERT INTO dating.feed_posts (author_id, mode, category, question)
               VALUES ($1, $2, $3, $4) RETURNING id"#,
        )
        .bind(user_id)
        .bind(mode)
        .bind(category)
        .bind(question)
        .fetch_one(&self.pool)
        .await?;
        let posts = self
            .feed(
                user_id,
                FeedQuery {
                    mode: None,
                    cursor: None,
                    limit: Some(50),
                },
            )
            .await?;
        let wanted = id.to_string();
        posts
            .into_iter()
            .find(|p| p.id == wanted)
            .ok_or_else(|| AppError::internal("post not found after insert"))
    }

    pub async fn toggle_like(&self, user_id: Uuid, post_id: &str) -> AppResult<LikeToggleResponse> {
        let pid = Uuid::parse_str(post_id).map_err(|_| AppError::bad_request("Invalid post id"))?;
        let deleted =
            sqlx::query("DELETE FROM dating.post_likes WHERE post_id = $1 AND user_id = $2")
                .bind(pid)
                .bind(user_id)
                .execute(&self.pool)
                .await?
                .rows_affected();
        let liked = if deleted == 0 {
            sqlx::query(
                "INSERT INTO dating.post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(pid)
            .bind(user_id)
            .execute(&self.pool)
            .await?;
            true
        } else {
            false
        };
        let like_count: i64 =
            sqlx::query_scalar("SELECT count(*) FROM dating.post_likes WHERE post_id = $1")
                .bind(pid)
                .fetch_one(&self.pool)
                .await?;
        Ok(LikeToggleResponse { liked, like_count })
    }

    pub async fn comments(&self, user_id: Uuid, post_id: &str) -> AppResult<Vec<CommentJson>> {
        let pid = Uuid::parse_str(post_id).map_err(|_| AppError::bad_request("Invalid post id"))?;
        let rows = sqlx::query_as::<_, CommentRow>(
            r#"SELECT c.id, c.user_id, pr.display_name AS user_name, c.body, c.created_at
               FROM dating.post_comments c JOIN dating.profiles pr ON pr.user_id = c.user_id
               WHERE c.post_id = $1
                 AND NOT EXISTS (SELECT 1 FROM dating.blocks b
                                 WHERE (b.blocker_id = $2 AND b.blocked_id = c.user_id)
                                    OR (b.blocker_id = c.user_id AND b.blocked_id = $2))
               ORDER BY c.created_at ASC LIMIT 200"#,
        )
        .bind(pid)
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows
            .into_iter()
            .map(|r| CommentJson {
                id: r.id.to_string(),
                mine: r.user_id == user_id,
                user_id: r.user_id.to_string(),
                name: r.user_name,
                body: r.body,
                created_at: r.created_at.to_rfc3339(),
            })
            .collect())
    }

    pub async fn add_comment(
        &self,
        user_id: Uuid,
        post_id: &str,
        body: &str,
    ) -> AppResult<CommentJson> {
        let pid = Uuid::parse_str(post_id).map_err(|_| AppError::bad_request("Invalid post id"))?;
        let body = body.trim();
        if body.is_empty() || body.chars().count() > 500 {
            return Err(AppError::bad_request("Comment must be 1–500 characters"));
        }
        let row = sqlx::query_as::<_, CommentRow>(
            r#"WITH ins AS (
                 INSERT INTO dating.post_comments (post_id, user_id, body) VALUES ($1, $2, $3)
                 RETURNING id, user_id, body, created_at)
               SELECT ins.id, ins.user_id, pr.display_name AS user_name, ins.body, ins.created_at
               FROM ins JOIN dating.profiles pr ON pr.user_id = ins.user_id"#,
        )
        .bind(pid)
        .bind(user_id)
        .bind(body)
        .fetch_one(&self.pool)
        .await?;
        Ok(CommentJson {
            id: row.id.to_string(),
            user_id: row.user_id.to_string(),
            name: row.user_name,
            body: row.body,
            mine: true,
            created_at: row.created_at.to_rfc3339(),
        })
    }

    // -----------------------------------------------------------------------
    // Safety
    // -----------------------------------------------------------------------

    pub async fn block(&self, user_id: Uuid, target: &str) -> AppResult<OkResponse> {
        let tid = Uuid::parse_str(target).map_err(|_| AppError::bad_request("Invalid user id"))?;
        if tid == user_id {
            return Err(AppError::bad_request("Cannot block yourself"));
        }
        sqlx::query("INSERT INTO dating.blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING")
            .bind(user_id)
            .bind(tid)
            .execute(&self.pool)
            .await?;
        let (a, b) = if user_id < tid {
            (user_id, tid)
        } else {
            (tid, user_id)
        };
        sqlx::query(
            r#"UPDATE dating.matches SET unmatched_at = NOW(), unmatched_by = $3
               WHERE user_a = $1 AND user_b = $2 AND unmatched_at IS NULL"#,
        )
        .bind(a)
        .bind(b)
        .bind(user_id)
        .execute(&self.pool)
        .await?;
        Ok(OkResponse { ok: true })
    }

    pub async fn unblock(&self, user_id: Uuid, target: &str) -> AppResult<OkResponse> {
        let tid = Uuid::parse_str(target).map_err(|_| AppError::bad_request("Invalid user id"))?;
        sqlx::query("DELETE FROM dating.blocks WHERE blocker_id = $1 AND blocked_id = $2")
            .bind(user_id)
            .bind(tid)
            .execute(&self.pool)
            .await?;
        Ok(OkResponse { ok: true })
    }

    pub async fn report(
        &self,
        user_id: Uuid,
        target: &str,
        req: ReportRequest,
    ) -> AppResult<OkResponse> {
        let tid = Uuid::parse_str(target).map_err(|_| AppError::bad_request("Invalid user id"))?;
        let reason = req.reason.trim();
        if reason.is_empty() || reason.chars().count() > 80 {
            return Err(AppError::bad_request("Pick a reason"));
        }
        sqlx::query(
            r#"INSERT INTO dating.reports (reporter_id, reported_id, reason, details)
               VALUES ($1, $2, $3, $4)"#,
        )
        .bind(user_id)
        .bind(tid)
        .bind(reason)
        .bind(
            req.details
                .as_deref()
                .map(|d| d.chars().take(2000).collect::<String>()),
        )
        .execute(&self.pool)
        .await?;
        log::warn!("report: {user_id} reported {tid}: {reason}");
        Ok(OkResponse { ok: true })
    }

    pub async fn blocked_users(&self, user_id: Uuid) -> AppResult<Vec<PublicProfileJson>> {
        let ids: Vec<Uuid> = sqlx::query_scalar(
            "SELECT blocked_id FROM dating.blocks WHERE blocker_id = $1 ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;
        if ids.is_empty() {
            return Ok(vec![]);
        }
        // Blocked users are hidden by public_select; fetch minimal rows directly.
        #[derive(sqlx::FromRow)]
        struct Row {
            user_id: Uuid,
            display_name: String,
            city: String,
        }
        let rows = sqlx::query_as::<_, Row>(
            "SELECT user_id, display_name, city FROM dating.profiles WHERE user_id = ANY($1)",
        )
        .bind(&ids)
        .fetch_all(&self.pool)
        .await?;
        let mut photos = self.photos_for(&ids).await?;
        Ok(rows
            .into_iter()
            .map(|r| {
                let ph = photos.remove(&r.user_id).unwrap_or_default();
                PublicProfileJson {
                    id: r.user_id.to_string(),
                    name: r.display_name,
                    age: 0,
                    gender: None,
                    city: r.city,
                    distance_km: None,
                    is_new: None,
                    online: None,
                    interests: vec![],
                    about: String::new(),
                    intent: "both".into(),
                    match_percent: 0,
                    photo_url: ph.first().map(|p| p.url.clone()),
                    photos: ph,
                }
            })
            .collect())
    }

    // -----------------------------------------------------------------------
    // Account
    // -----------------------------------------------------------------------

    pub async fn delete_account(&self, user_id: Uuid) -> AppResult<OkResponse> {
        let keys: Vec<Option<String>> =
            sqlx::query_scalar("SELECT storage_key FROM dating.photos WHERE user_id = $1")
                .bind(user_id)
                .fetch_all(&self.pool)
                .await?;
        // Cascades: profiles, photos, swipes, matches, conversations, messages,
        // blocks, reports, feed, devices, refresh tokens.
        sqlx::query("DELETE FROM auth.users WHERE id = $1")
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        for k in keys.into_iter().flatten() {
            self.storage.delete(&k).await;
        }
        Ok(OkResponse { ok: true })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(v: &[&str]) -> Vec<String> {
        v.iter().map(|x| x.to_string()).collect()
    }

    #[test]
    fn match_percent_bounds() {
        assert_eq!(match_percent(&[], &[], "both", "both"), 57);
        let full = match_percent(&s(&["a", "b"]), &s(&["a", "b"]), "friends", "friends");
        assert_eq!(full, 99);
        let none = match_percent(&s(&["a"]), &s(&["b"]), "friends", "partner");
        assert_eq!(none, 52);
    }

    #[test]
    fn match_percent_partial_overlap() {
        let p = match_percent(&s(&["a", "b", "c"]), &s(&["a", "d"]), "both", "friends");
        // 1 shared of 4 union → 52 + 10.5 + 5 = 67.5 → 68
        assert_eq!(p, 68);
    }

    #[test]
    fn birthday_parsing() {
        assert!(parse_birthday("2020-01-01").is_err());
        assert!(parse_birthday("1990-13-01").is_err());
        assert!(parse_birthday("1990-06-15").is_ok());
        assert!(parse_birthday("1800-06-15").is_err());
    }
}
