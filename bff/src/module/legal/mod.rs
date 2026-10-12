//! Privacy policy + terms served by the BFF so the Play Store listing and the
//! in-app Settings link always point at something live.

use actix_web::{web, HttpResponse};
use std::sync::Arc;

use crate::configuration::Settings;

fn page(title: &str, body: &str) -> String {
    format!(
        r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<style>body{{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#22172A;line-height:1.55}}
h1,h2{{color:#4B164C}}a{{color:#DD88CF}}</style></head><body>{body}</body></html>"#
    )
}

pub async fn privacy(settings: web::Data<Arc<Settings>>) -> HttpResponse {
    let app = settings
        .legal
        .app_name
        .clone()
        .unwrap_or_else(|| "Palora".into());
    let company = settings
        .legal
        .company
        .clone()
        .unwrap_or_else(|| app.clone());
    let support = settings
        .legal
        .support_email
        .clone()
        .unwrap_or_else(|| settings.email.from_email.clone());
    let body = format!(
        r#"<h1>{app} Privacy Policy</h1>
<p>Last updated: 2026-09-25</p>
<h2>What we collect</h2>
<ul>
<li>Account: name, email, phone number (if you sign in with phone), Google account ID (if you sign in with Google), date of birth.</li>
<li>Profile: photos, gender, who you want to meet, interests, bio, city and approximate location (only while you use Discover, if you grant permission).</li>
<li>Activity: likes, passes, matches, messages you send, posts and comments, reports and blocks.</li>
<li>Device: push notification token, app version, IP address for security and rate limiting.</li>
</ul>
<h2>How we use it</h2>
<ul>
<li>To show you people nearby and let you match and chat.</li>
<li>To keep the community safe: age verification (18+), blocking, reports, abuse prevention.</li>
<li>To send push notifications about matches and messages (you can turn these off in system settings).</li>
<li>To sign you in and keep your session secure.</li>
</ul>
<h2>Sharing</h2>
<p>Your profile (photos, name, age, city, distance, bio, interests) is visible to other {app} users who fit your preferences. Messages are visible only to you and the person you matched with. We do not sell personal data. We use infrastructure providers (hosting, SMS, email, push delivery) that process data on our behalf.</p>
<h2>Retention and deletion</h2>
<p>You can delete your account at any time from Settings → Delete account, or by emailing <a href="mailto:{support}">{support}</a>. Deletion removes your profile, photos, matches and messages within 30 days. Reports you filed and safety records may be kept as required by law.</p>
<h2>Children</h2>
<p>{app} is for adults 18 and over. We remove accounts of anyone under 18.</p>
<h2>Contact</h2>
<p>{company} — <a href="mailto:{support}">{support}</a></p>"#
    );
    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(page(&format!("{app} Privacy Policy"), &body))
}

pub async fn terms(settings: web::Data<Arc<Settings>>) -> HttpResponse {
    let app = settings
        .legal
        .app_name
        .clone()
        .unwrap_or_else(|| "Palora".into());
    let support = settings
        .legal
        .support_email
        .clone()
        .unwrap_or_else(|| settings.email.from_email.clone());
    let body = format!(
        r#"<h1>{app} Terms of Use</h1>
<p>Last updated: 2026-09-25</p>
<ul>
<li>You must be 18 or older to use {app}.</li>
<li>Use your own photos and real information. Impersonation, harassment, hate, sexual content involving minors, spam and scams are prohibited and lead to removal.</li>
<li>Respect other users. Use Block and Report if someone makes you uncomfortable; we review every report.</li>
<li>You own the content you post; you grant us a licence to display it inside {app} to other users.</li>
<li>We may suspend accounts that violate these terms.</li>
<li>Questions: <a href="mailto:{support}">{support}</a></li>
</ul>"#
    );
    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(page(&format!("{app} Terms"), &body))
}
