# Palora — Google Play Console Submission Guide (2026)

Master reference and exact answers for publishing **Palora** (`com.kraftisium.palora`, v0.2.0) on the Google Play Console.

---

## Part 1: Let us know about the content of your app (App Content)

### 1. Set privacy policy
* **Privacy Policy URL**:
  ```
  https://palora.kraftisium.xyz/privacy
  ```
  *(Alternative direct API endpoint: `https://palora.kraftisium.xyz/api/v1/legal/privacy`)*
* **Compliance details**: Hosted with valid HTTPS/SSL, publicly accessible worldwide without login, non-editable HTML webpage disclosing exact permissions (camera, photos, approximate and fine location, in-app chat, account deletion).

---

### 2. Sign-in details (App access)
Google requires working reviewer access if the app has login/onboarding.

* **Selection**: Select **"All or some functionality in my app is restricted"**
* Click **+ Add instructions**:
  * **Instruction name**: `Reviewer Login`
  * **Username / Email**: `playstore@palora.app`
  * **Password**: `PaloraReview2026!`
  * **Phone number**: *(Leave blank)*
  * **Any other instructions**:
    ```
    No 2-factor authentication required. Use the provided email and password to log in. The account has already been verified and pre-configured with active matches, chat conversations, swipe deck candidates, and profile media for evaluation.
    ```

---

### 3. Ads
* **Question**: "Does your app contain ads?"
* **Answer**: Select **"No, my app does not contain ads"**
  *(Palora contains no advertising SDKs or third-party ad networks)*.

---

### 4. Content rating (IARC Questionnaire)
Click **Start questionnaire**:
* **Email address**: `support@kraftisium.xyz`
* **Category**: Select **Social or Communication** (or **Social Networking / Dating**)

#### Questionnaire Answers:
* **Violence**: No
* **Sexuality**: No *(App strictly prohibits nudity/explicit material)*
* **Language**: No
* **Controlled Substance**: No
* **Promotion of Age-Restricted Products**: No
* **Miscellaneous / Interactions**:
  * *Does the app allow users to interact or exchange content with other users through text, sharing photos, or audio?* -> **Yes**
  * *Does the app share the user's current and precise physical location with other users?* -> **No** *(Palora calculates relative distance and locality/city, but never reveals raw GPS coordinates or real-time physical locations to other users)*.
  * *Does the app allow users to purchase digital goods?* -> **No** *(Palora v0.2.0 has no in-app purchases/digital billing enabled in this release)*.
  * *Is the app a web browser or search engine?* -> **No**

---

### 5. Target audience and content
* **Target age group**:
  * Check **18 and over** ONLY.
  * *(DO NOT check any age range below 18. Palora enforces an 18+ age restriction)*.
* **Could your store listing appeal to children?**:
  * Select **No**.

---

### 6. Data safety
Click **Start** or **Manage**:

#### Page 1: Data collection and security
* *Does your app collect or share any of the required user data types?* -> **Yes**
* *Is all of the user data collected by your app encrypted in transit?* -> **Yes** *(HTTPS/TLS)*
* *Do you provide a way for users to request that their data is deleted?* -> **Yes**
* *Delete account URL*:
  ```
  https://palora.kraftisium.xyz/delete-account
  ```

#### Page 2: Data types declaration
Check the boxes for the following categories:

1. **Location**:
   * Check **Approximate location**
   * Check **Precise location**
2. **Personal info**:
   * Check **Name**
   * Check **Email address**
   * Check **User IDs**
   * Check **Other info** (Gender, Date of birth / Age)
3. **Photos and videos**:
   * Check **Photos**
4. **Messages**:
   * Check **Other in-app messages**
5. **Device or other IDs**:
   * Check **Device or other IDs**

*(Leave Financial, Health, Contacts, Calendar, Audio, Web browsing, and Crash logs unchecked).*

#### Page 3: Data details (for each checked type)

| Data Type | Collected? | Shared? | Ephemeral? | Optional? | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Approximate location** | **Yes** | **No** | **No** | **Yes** (Optional) | App functionality, Personalization |
| **Precise location** | **Yes** | **No** | **No** | **Yes** (Optional) | App functionality, Personalization |
| **Name** | **Yes** | **No** | **No** | **No** (Required) | App functionality, Account management |
| **Email address** | **Yes** | **No** | **No** | **No** (Required) | App functionality, Account management |
| **User IDs** | **Yes** | **No** | **No** | **No** (Required) | App functionality, Account management |
| **Other info (Age, Gender)**| **Yes** | **No** | **No** | **No** (Required) | App functionality, Account management |
| **Photos** | **Yes** | **No** | **No** | **Yes** (Optional) | App functionality |
| **Other in-app messages** | **Yes** | **No** | **No** | **Yes** (Optional) | App functionality |
| **Device or other IDs** | **Yes** | **No** | **No** | **Yes** (Optional) | App functionality (Push alerts) |

*For all data types: "Is this data processed ephemerally?" -> **No**.*
*For all data types: "Do users have the ability to request data deletion?" -> **Yes**.*

---

### 7. Government apps
* **Question**: "Is your app developed by or on behalf of a government?"
* **Answer**: Select **No**

---

### 8. Financial features
* **Question**: "Does your app provide any financial features?"
* **Answer**: Select **My app doesn't provide any financial features**

---

### 9. Health features
* **Question**: "Does your app provide health features?"
* **Answer**: Select **My app doesn't provide any health features**

---

### 10. Child safety standards (Social / Dating requirement)
* **Safety standards URL**:
  ```
  https://palora.kraftisium.xyz/safety
  ```
  *(Live, valid HTTPS, discloses zero tolerance for CSAE/CSAM, 18+ enforcement, in-app reporting, NCMEC and law enforcement cooperation)*.
* **Contact**:
  * Select: **Use animesh080808@gmail.com, the contact email address associated with this developer account**
* **Declarations (Check both boxes)**:
  - [x] **Palora: Meet & Date Nearby allows users to report child safety concerns in-app.**
  - [x] **My app complies with all relevant child safety laws, and reports to regional and national authorities.**


---

## Part 2: Manage how your app is organised and presented

### 10. App category and contact details
* **App or game**: Select **App**
* **Category**: Select **Dating** *(or **Social** if Dating is not listed as primary)*
* **Tags**: Add `Dating`, `Social networking`, `Lifestyle`, `Communication`
* **Developer contact details**:
  * **Email address**: `support@kraftisium.xyz`
  * **Phone number**: *(Optional — leave blank)*
  * **Website**: `https://palora.kraftisium.xyz`
* **External marketing**: Checked (recommended)

---

### 11. Set up your Store Listing

#### App Name
```
Palora: Meet & Date Nearby
```
*(26 characters / 30 max)*

#### Short Description
```
Connect, match, and chat with genuine people nearby for friendship and dating.
```
*(79 characters / 80 max)*

#### Full Description
```
Welcome to Palora — the modern social discovery platform designed to help you meet authentic people nearby for dating, companionship, and genuine friendship.

Whether you are looking to find your next romance, meet like-minded friends in your city, or expand your social circle, Palora gives you the tools to connect safely, meaningfully, and naturally.

WHY YOU’LL LOVE PALORA:

✨ DUAL DISCOVERY MODES
Switch effortlessly between Dating Mode and Friendship/BFF Mode. Choose your vibe and discover people who are looking for the exact same connection you are.

📍 SMART LOCAL DISCOVERY
Discover verified profiles nearby based on distance and shared interests. Filter by age, lifestyle habits, relationship goals, and background to find people on your wavelength.

📸 RICH PROFILE & STORIES
Share who you are through expressive profile photos, personal bios, interests, and disappearing daily stories. Experience authentic moments before saying hello.

💬 REAL-TIME CHAT & MESSAGING
Break the ice with seamless, secure 1-on-1 messaging once you mutually match. No unsolicited spam — you only receive messages from people you choose to connect with.

🛡️ SAFETY & PRIVACY FIRST
Your security is our highest priority:
- Strict 18+ community with proactive age verification
- Full control over your location visibility (we never share your precise real-time coordinates)
- Instant self-serve account deletion anytime in Settings
- Easy 1-tap reporting and blocking tools to keep our community safe and respectful

Ready to find genuine connections? Download Palora today and discover who’s waiting to meet you!

Support & Questions: support@kraftisium.xyz
Privacy Policy: https://palora.kraftisium.xyz/privacy
```

#### Graphics & Assets
Generated and saved in `apps/palora/play-store-assets/`:
* **App Icon**: `apps/palora/play-store-assets/app-icon-512.png` (512 × 512 PNG, 32-bit color)
* **Feature Graphic**: `apps/palora/play-store-assets/feature-graphic-1024x500.png` (1024 × 500 PNG)
* **Phone Screenshots**: Take 2 to 8 vertical screenshots (9:16 aspect ratio) directly from your Android test device or emulator.
