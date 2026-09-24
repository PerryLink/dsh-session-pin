<div align="center">

# 📌 dsh-session-pin
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-session-pin` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness साइडबार में सत्रों और कार्यक्षेत्रों को शीर्ष पर पिन करें, हर पिन के साथ पंक्ति-रंग दें।**

*एक दोहरे-चेहरे (host + browser) वाला plugin: पिन के दो स्तर, हर पिन के लिए 8-रंग का बटन, और एक नेविगेशन आयोजक — boards, टैग, सहेजे गए दृश्य, स्वास्थ्य सारांश और `/goto`।*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-session-pin)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-session-pin.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-session-pin/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-session-pin/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-session-pin?label=version)](https://github.com/PerryLink/dsh-session-pin/releases)
[![npm version](https://img.shields.io/npm/v/dsh-session-pin)](https://www.npmjs.com/package/dsh-session-pin)
[![npm downloads](https://img.shields.io/npm/dm/dsh-session-pin)](https://www.npmjs.com/package/dsh-session-pin)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-session-pin?metric=downloads&lang=hi)](https://dshfind.com/hi/plugins/PerryLink/dsh-session-pin?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---


<!-- star-cta -->
## ⭐ 如果它帮到了你

यह प्लगइन [DSH प्लगइन परिवार](https://github.com/PerryLink) का हिस्सा है (40+ प्लगइन, सभी Apache-2.0)। अगर यह उपयोगी लगे, तो **एक स्टार दें** — इससे कोई सुविधा अनलॉक नहीं होती, पर अगला व्यक्ति इसे खोज में आसानी से पा लेता है।

*English:* part of a 40+ plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.
## Compatibility

| सतह | स्थिति |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.1.7-rc.2` (GitHub tag, 2026-09-22 को सत्यापित: दोहरी-रूलर typecheck + unit/composition सूट + स्थैतिक सीम जाँच; ब्राउज़र दौर अनुरक्षक के पास)। npm पिन `0.1.7-rc.2`, peers `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0 || >=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0`। |
| Node | `>= 22` (डेवलपमेंट आधार) |
| प्लेटफ़ॉर्म | Web GUI (दोहरा चेहरा: host + browser) |
| मॉडल | कोई भी (केवल UI — कोई मॉडल ट्रैफ़िक नहीं, कोई सत्र घटना नहीं) |
| `session/pin` इवेंट | प्री-फ़्लाइट गेट: केवल तभी लिखे जाते हैं जब host का रनटाइम इवेंट शब्दकोश प्रकार जानता है (alpha-लाइन का append अब `ignorable` मार्कर स्टैम्प नहीं कर सकता, इसलिए शब्दकोश ही गेट का एकमात्र संकेत है — 2026-09-18 को अनुकूलित); अन्यथा projection settings cache पर degrade हो जाता है और पहली लेखन से पहले एक चेतावनी दी जाती है। |

## What you get

`dsh-session-pin` उन बातचीतों को साइडबार में शीर्ष पर रखता है जो मायने रखती हैं और उन्हें रंग देता है ताकि एक नज़र में मिल जाएँ:

- **पिन के दो स्तर** — पूरे workspace और अलग-अलग session पिन करें; पिन किया workspace workspace सूची में और पिन किया session अपने खाते में सबसे आगे चला जाता है।
- **हर पिन का पंक्ति-रंग** — हर पिन के बाद का रंग बटन 8-रंग की preset palette घुमाता है (Shift+क्लिक साफ़ करता है); पंक्ति को बाईं ओर एक accent पट्टी और पारभासी रंगत मिलती है।
- **चार पिन सतहें** — हर पंक्ति पर एक hover `[pin][रंग]` जोड़ी, session हेडर में एक टॉगल, pinned पैनल वाली sidebar फुट क्रिया, और हर-ब्राउज़र टिकाऊ pinning जो रीस्टार्ट के बाद भी pin और रंग बनाए रखता है।
- **क्लिक-से-खोलो** — साइडबार या pinned पैनल में पिन की गई पंक्ति पर क्लिक करने से session मौजूदा विंडो में खुलता है (वही सीम जो `/goto` इस्तेमाल करता है); दोनों alpha लाइन पर host के session-retain चैनल से नेविगेट करते हैं।
- **कोर में शून्य बदलाव** — स्टॉक DSH Web GUI के लिए एक स्वतंत्र plugin; हर सतह पुरानी आधाररेखाओं पर सहज रूप से degrade हो जाती है।

```text
┌─ Workspaces ────────────────────────────┐
│ 🎨 Workbench            ███             │  ← पिन किया workspace, लाल रंग
│   📌 Implement login flow         3h    │  ← पिन किया session, टील रंग
│     Fix the auth bug              1h    │  ← hover पर ग्रे pin + रंग बटन
│   Refactor the DB layer           2d    │
└─────────────────────────────────────────┘
```

## Navigation organizer

चार ब्राउज़र-स्थानीय क्षमताएँ pinning के ऊपर बहु-सत्र कार्य को व्यवस्थित करती हैं। सारा state उसी `session-pin` store में रहता है (हर-ब्राउज़र; कुछ भी अपलोड नहीं होता), और हर एक का Config स्विच है।

- **Boards** — pins नामित समूहों में जुड़ते हैं; चिप पंक्ति boards बनाती, नाम बदलती और हटाती है तथा उन्हें खींचकर पुनःक्रमित करती है (क्रम हर-ब्राउज़र बना रहता है), जबकि पैनल हर board के pins को एक संकुचित शीर्षक के नीचे समूहित करता है।
- **टैग और दृश्य** — entities पर अधिकतम 8 टैग (हर एक ≤24 अक्षर), पैनल के प्रबंधन बटन से प्रति पंक्ति सेट किए जाते हैं (जो pin का board भी असाइन करता है); फ़िल्टर बार टेक्स्ट और टैग से मिलाता है, और कोई भी फ़िल्टर स्थिति एक नामित दृश्य (अधिकतम 20) बनकर एक क्लिक में बदल जाती है।
- **स्वास्थ्य सारांश** — हर पिन की गई session पंक्ति में सार्वजनिक session snapshot से व्युत्पन्न रीड-ओनली, सैनिटाइज़्ड पंक्ति (`N msgs · you|ai · सापेक्ष समय`) जुड़ती है — केवल गणना व दिशा, सामग्री कभी नहीं।
- **`/goto <कीवर्ड>`** — कम्पोज़र में `/goto` से शुरू होने वाली पंक्ति + Enter: अद्वितीय मिलान खोलता है, कई मिलान सूची देते हैं, कोई मिलान नहीं तो स्पष्टीकरण। कमांड पंक्ति मॉडल तक कभी नहीं पहुँचती।

## How it works

- **Host आधा** (`src/index.ts`) — `session-pin` settings फ़ॉर्म को plugin के अपने live Config के रूप में घोषित करता है: दो पिन की गई id सूचियाँ, दो रंग मानचित्र, आयोजक state और host नीति (`maxPins`/`reorderOnLoad`/`pruneStale` तथा पाँच फ़ीचर स्विच) सभी `.volatile()` फ़ील्ड हैं। `0.1.7` settings contract में किसी फ़ॉर्म का namespace उसकी profile entry का स्थानीय id होता है, इसलिए bundle patch की `id: session-pin` पंक्ति ही फ़ॉर्म का नाम है, Plugins पेज उसे संपादित करता है, और स्वीकृत संपादन चल रहे plugin पर hot-apply होते हैं; कोई session event नहीं, कोई मॉडल ट्रैफ़िक नहीं।
- **Browser आधा** (`src/client.ts`) — एक framework-मुक्त `PinStore` (host आधे का live Config फ़ॉर्म, `ctx.configForms.get(entryId)` से पढ़ा गया, टैब-सिंक वाले versioned `localStorage` दस्तावेज़ पर degrade), एक `PinController` (दो-स्तरीय toggle / रंग चक्र / prune / reorder स्टेट मशीन) और UI जोड़ता है: पंक्ति ओवरले, वैकल्पिक पंक्ति-slot पंजीकरण, हेडर टॉगल, फुट क्रिया और pinned पैनल। क्रम `ctx.workspaces` से होकर जाता है।
- **log-समर्थित लेखन चैनल** — बिल्ट-इन `dsh-session-pin` सेवा माउंट करने वाले builds पर, हर session टॉगल पहले `session.setPinned` RPC से commit होता है (`session/pin` इवेंट log canonical residence है) और settings store में mirror होता है; विफल या धीमा RPC सीधे settings लेखन पर degrade हो जाता है।
- **log-समर्थित projection पठन** — `enableLogBacking` (host Config, fail-closed डिफ़ॉल्ट बंद) एक reader माउंट करता है जो लाइव `session/pin` इवेंट्स को canonical pin सेट में fold करता है और folded `pinned`/`colors` को live Config में mirror करता है। इवेंट schema, शुद्ध fold (`foldPinEvents`) और प्री-फ़्लाइट-गेटेड append seam (`PinLogAppender`) `src/pin-log.ts` में रहते हैं: host का **रनटाइम इवेंट शब्दकोश** गेट का एकमात्र संकेत है, **पहले append से पहले** तय होता है (alpha-लाइन का append अब `ignorable` स्टैम्प नहीं कर सकता, इसलिए मार्कर जाँच हट गई), इसलिए जो hosts इवेंट को सुरक्षित नहीं ले जा सकते — जो शब्दकोश प्रकार नहीं जानता वह पढ़ने पर fail-closed होता है — उन्हें एक भी लेखन नहीं मिलता; live Config/localStorage store संगतता व degradation पथ बना रहता है।
- **क्लाइंट seam** — browser आधा `SessionId`/`WorkspaceId` brands को `@deepseek-ai/dsh-client-connection` से पढ़ता है (हटाया गया `dsh-client-runtime` पैकेज वर्तमान hosts पर मौजूद नहीं है); session-हेडर slot की standard-kit सीटें स्थानीय structural contract के रूप में टाइप होती हैं। `0.1.2-rc.1` hosts पर `sessions.row.action` पंक्ति slot घोषित नहीं है, इसलिए session पंक्तियाँ DOM ओवरले पर fallback करती हैं और slot पंजीकरण टाला रहता है।
- **बिल्ड** — esbuild host ESM आधा और वेब बूट फ़ैक्टरी (`window.__ModuleLoader__.load({ id, factory })`) में लिपटा client CJS आधा उत्सर्जित करता है; `react` shell के अपने React पर externalize होता है, और कोई `@deepseek-ai/*` मान-आयात ब्राउज़र bundle में रिसने पर purity gate बिल्ड विफल कर देता है।

**उपयोग किए गए एक्सटेंशन पॉइंट:** `settings` (host); `sessions`, `workspaces`, `configForms`, `connection`, `slots` (client); `locale` (client, वैकल्पिक); `conversation.session.header.actions`, `sidebar.footer.action`, `shell.overlay`, और upstream का `sessions.row.action` पंक्ति slot जब घोषित हो (`0.1.2-rc.1` hosts इसे घोषित नहीं करते — वहाँ session पंक्तियाँ DOM ओवरले से ढकती हैं)। **मॉडल-दृश्य प्रभाव: कोई नहीं** — केवल-UI plugin: न कोई session event जोड़ता है और न किसी मॉडल अनुरोध में token।

## Quick start

```sh
# 1. bundle को अपने profile में इंस्टॉल करें
dsh plugin --profile web add "github:PerryLink/dsh-session-pin#main"

# या npm से (प्रकाशित संस्करण)
dsh plugin --profile web add dsh-session-pin

# 2. रीस्टार्ट करें और पंक्ति की पुष्टि करें
dsh --profile web --dump-config | grep -A3 'id: session-pin'
```

> **Loader entry id।** जिन harness builds का `dsh-base` bundle बिल्ट-इन host सेवा `@deepseek-ai/dsh-session-pin` माउंट करता है (entry id `session-pin`), वहाँ इस plugin को profile patch पंक्ति में एक अलग entry id दें, जैसे `id: session-pin-ui` — डुप्लिकेट `session-pin` id से बूट "duplicate loader entry id" के साथ विफल हो जाता है।

## Install & uninstall

- **git चैनल** (नवीनतम `main`): `dsh plugin --profile web add "github:PerryLink/dsh-session-pin#main"` — `pnpm run build` host आधा (`lib/index.js`) और browser आधा (`lib/client.js`) उत्सर्जित करता है।
- **npm चैनल** (प्रकाशित संस्करण): `dsh plugin --profile web add dsh-session-pin`।
- **tarball चैनल**: इस repo में `pnpm pack`, फिर `dsh plugin --profile web add ./dsh-session-pin-<version>.tgz`।
- **अनइंस्टॉल**: `dsh plugin --profile web remove dsh-session-pin` (या profile patch से पंक्ति हटाएँ — वही पंक्ति settings फ़ॉर्म का namespace है, इसलिए हटाने पर संग्रहीत फ़ॉर्म मान भी हट जाते हैं)।

## Configuration

सभी ट्यूनेबल Schemastery `Config` फ़ील्ड हैं। तालिका का हर फ़ील्ड `.volatile()` है, इसलिए इसे `cordis.yml` से ही नहीं, profile के Plugins पेज से भी लाइव संपादित किया जा सकता है (स्वीकृत संपादन plugin को दोबारा माउंट किए बिना उसी में commit हो जाता है); pin सूचियाँ, रंग मानचित्र और आयोजक state इसी प्रकार के फ़ील्ड हैं, और यही browser आधे के store को टिकाऊ बनाता है। `enableLogBacking` जानबूझकर volatile **नहीं** है: यह कभी संपादन-योग्य सतह का हिस्सा नहीं था और कोई browser आधा इसे नहीं पढ़ता। `cordis.patch.yml` नीचे दिए डिफ़ॉल्ट के साथ bundle माउंट करता है।

| कुंजी | डिफ़ॉल्ट | अर्थ |
|---|---|---|
| `maxPins` | `0` | हर स्तर के लिए पिन की गई entities की अधिकतम संख्या (session और workspace का अपना बजट); `0` = असीमित |
| `reorderOnLoad` | `true` | सूचियाँ तैयार होते ही पिन किए उपसर्ग (सबसे नया pin पहले) फिर से लागू करता है |
| `pruneStale` | `true` | तैयार सूची से गायब entities (हटाई/संग्रहीत) के pins और रंग हटा देता है |
| `enableBoards` | `true` | साइडबार पैनल में पिन समूह (boards) सक्षम करें |
| `enableTags` | `true` | session/workspace टैग और पैनल फ़िल्टर बार सक्षम करें |
| `enableViews` | `true` | सहेजे गए फ़िल्टर दृश्य सक्षम करें |
| `enableHealth` | `true` | हर पिन किए session का स्वास्थ्य सारांश सक्षम करें (रीड-ओनली, सैनिटाइज़्ड) |
| `enableGoto` | `true` | कम्पोज़र का `/goto <कीवर्ड>` कमांड सक्षम करें |
| `enableLogBacking` | `false` | `session/pin` इवेंट्स को log-समर्थित projection में fold करें और settings cache में mirror करें (fail-closed: सक्षम होने पर log canonical है) |

## Tools & surfaces

| सतह | प्रकार | टिप्पणियाँ |
|---|---|---|
| `[pin][रंग]` पंक्ति नियंत्रण | UI slot / DOM ओवरले | हर session और workspace पंक्ति पर hover नियंत्रण |
| session हेडर टॉगल | UI slot | हेडर की क्रिया-पंक्ति में वही नियंत्रण, session id से जोड़ा गया |
| sidebar फुट + pinned पैनल | UI slot / ओवरले | पिन किए workspace और session board के अनुसार समूहित (संकुचित), प्रति पंक्ति board/tag प्रबंधन और रंग-बिंदुओं के साथ सूचीबद्ध करता है |
| `/goto <कीवर्ड>` | command | शीर्षक/टैग से कम्पोज़र त्वरित-छलांग; पंक्ति मॉडल तक कभी नहीं पहुँचती |
| `session-pin` settings फ़ॉर्म | host सेवा | plugin का अपना live Config, प्रति profile टिकाऊ: pins, रंग और आयोजक state |

## Permissions & data

- **अनुमतियाँ**: `dshWorkshop` manifest `browser:local-storage`, `settings:read` और `settings:write` घोषित करता है।
- **डेटा**: pins, रंग और आयोजक state plugin के `session-pin` settings फ़ॉर्म में रहते हैं (यानी `pinned`/`workspacePinned`/`colors`/`workspaceColors`/`boards`/`tags`/`views` volatile Config फ़ील्ड); जहाँ web proxy वह entry नहीं परोसता वहाँ versioned `localStorage` दस्तावेज़ (v1 दस्तावेज़ migrate होते हैं) पर degrade हो जाते हैं। कुछ भी अपलोड नहीं होता। `enableLogBacking` के साथ live Config, log-समर्थित `session/pin` projection का idempotent cache बन जाता है।
- **सत्र लॉग**: डिफ़ॉल्ट रूप से कोई नहीं — यह plugin न कोई session event जोड़ता है और न किसी मॉडल अनुरोध में token। `enableLogBacking` चालू होने पर, host केवल-log `session/pin` इवेंट (upstream `session.setPinned` RPC द्वारा लिखित) को canonical pin projection में fold करता है; `PinLogAppender` अपनी लेखन को प्री-फ़्लाइट गेट करता है, इसलिए जो hosts इवेंट नहीं ले जा सकते (`0.1.2-rc.1`) उन्हें एक भी लेखन नहीं मिलता। मॉडल-दृश्य प्रभाव फिर भी कोई नहीं।

## Security boundaries

- **केवल UI।** कोई मॉडल-दृश्य प्रभाव नहीं, कोई नेटवर्क नहीं, कोई subprocess नहीं; हर सतह पुरानी आधाररेखाओं पर सहज रूप से degrade होती है।
- **टिकाऊ और सीमित state।** pins और रंग हटाई गई entities के साथ prune हो जाते हैं (`pruneStale`); `maxPins` हर स्तर की पिन संख्या सीमित करता है।
- **रीड-ओनली स्वास्थ्य।** स्वास्थ्य सारांश सार्वजनिक session snapshot से केवल गणना व दिशा व्युत्पन्न करता है और कुछ वापस नहीं लिखता।

## Known limitations

- **स्थायित्व का दायरा** — log-समर्थित canonical residence वैकल्पिक है (`enableLogBacking`, fail-closed डिफ़ॉल्ट बंद) और उसका लाइव पठन लूप ऐसे builds चाहता है जो `session/pin` इवेंट उत्सर्जित करें (upstream `session.setPinned` RPC); उसके बिना आधाररेखाओं पर pins और रंग plugin के `session-pin` settings फ़ॉर्म पर, और फिर ब्राउज़र-स्थानीय `localStorage` पर fallback करते हैं। जिन hosts का इवेंट शब्दकोश प्रकार नहीं जानता, वहाँ प्री-फ़्लाइट गेट log appends को पूरी तरह बंद कर देता है (fail-closed पठन पथ ऐसे logs को अस्वीकार कर देता), इसलिए projection वहाँ settings cache पर degrade हो जाता है।
- **क्रम का दायरा** — पिन की स्थिति केवल **Manual** क्रम में स्थिर है; **Updated** क्रम में कोर की गतिविधि-प्रमोशन सक्रिय sessions को फिर से आगे कर देती है, और `reorderOnLoad` लोड पर उपसर्ग फिर से लागू करता है।
- **दूरस्थ ब्राउज़र** — baseline पर settings RPC केवल loopback हैं; दूरस्थ ब्राउज़र ब्राउज़र-स्थानीय `localStorage` पर fallback करते हैं।
- **पंक्ति बैज fallback** — जहाँ upstream का पंक्ति slot उपलब्ध नहीं है, session पंक्तियाँ शीर्षक पाठ से मेल खाती हैं; डुप्लिकेट शीर्षकों पर बैज हर मेल खाती पंक्ति पर दिखता है और पहले मेल को टॉगल करता है (कॉस्मेटिक)।
- **पंक्ति DOM निर्भरता** — ओवरले कोर पंक्तियों की `role="treeitem"` संरचना पर निर्भर है और उसे upstream के UI बदलावों का अनुसरण करना होगा।

## Roadmap

- राइट-क्लिक / पंक्ति-मेनू में «पिन» प्रविष्टि (कोर के पंक्ति-स्तरीय मेनू slot की आवश्यकता; पंक्ति बैज slot अब upstream में है)।
- ~~विहित स्थान: एक log-समर्थित `session/pin` event + `pin` projection + write RPC (upstream) — तब settings namespace टिकाऊ भंडार से हट जाता है और plugin `useProjection('pin')` का उपभोग करता है।~~ **लागू (P0):** plugin में अब `session/pin` event schema, शुद्ध projection fold (`foldPinEvents`), प्री-फ़्लाइट-गेटेड append seam (`PinLogAppender`) और एक host projection reader (`enableLogBacking`) है जो लाइव `session/pin` इवेंट्स को live Config cache में वापस fold करता है; live Config/localStorage संगतता व degradation पथ बने रहते हैं, और सक्षम होने पर log canonical है।
- विहित स्थान मौजूद होने पर एक पूर्ण रंग-चयनकर्ता popover (मनपसंद रंग); आज का चक्र बटन preset palette को कवर करता है।

## Development

```sh
pnpm install                    # निर्भरताएँ इंस्टॉल करें
pnpm run typecheck              # tsc --noEmit
pnpm test                       # vitest यूनिट टेस्ट
pnpm run build                  # दो-आधा build + client purity जाँच
node scripts/verify-live.mjs    # चालू `dsh web` के विरुद्ध लाइव जाँच (DSH_CHECKOUT env)
```

## Topics

`deepseek-harness`, `dsh`, `dsh-plugin`, `session-pin`, `pin`, `workspace`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — निर्माता और अनुरक्षक: pin अनुभव, टिकाऊ स्थायित्व, workspace क्रम, प्रति-pin रंग, नेविगेशन आयोजक और पाँच-भाषा दस्तावेज़।

## PerryLink DSH Plugin Family

This project is one of the **45 DeepSeek Harness plugins** maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-catalog](https://github.com/PerryLink/dsh-catalog)** | DSH Desktop Market standard catalog source for the PerryLink family | |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` | |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching | |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit | |
| **[dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification)** | Community certification registry with repro-checkable grades and badges | |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins | |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill | |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins | |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card | |
| **[dsh-plugin-upgrade-015](https://github.com/PerryLink/dsh-plugin-upgrade-015)** | Merged `0.1.3-alpha.1` → `0.1.5-rc.1` upgrade corridor card plus a zero-dependency seam scanner | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. | |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools | |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. | |


## License

[Apache License 2.0](LICENSE) © 2026 dsh-session-pin योगदानकर्ता

### DSH Desktop मार्केट से इंस्टॉल करें

सभी PerryLink प्लगइन DSH Desktop के बिल्ट-इन मार्केट में देखे जा सकते हैं: **Market → Sources → add source → पेस्ट करें** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ चुनें**। इंस्टॉलेशन मार्केट के npm-identity सत्यापन और आपकी पुष्टि से ही होता है।
