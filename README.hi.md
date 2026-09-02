<div align="center">

# 📌 dsh-session-pin
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-session-pin` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness साइडबार में सत्रों और कार्यक्षेत्रों को शीर्ष पर पिन करें, हर पिन के साथ पंक्ति-रंग दें।**

*एक दोहरे-चेहरे (host + browser) वाला plugin: पिन के दो स्तर, हर पिन के लिए 8-रंग का बटन, और एक नेविगेशन आयोजक — boards, टैग, सहेजे गए दृश्य, स्वास्थ्य सारांश और `/goto`।*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-session-pin/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-session-pin/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-session-pin?label=version)](https://github.com/PerryLink/dsh-session-pin/releases)
[![npm version](https://img.shields.io/npm/v/dsh-session-pin)](https://www.npmjs.com/package/dsh-session-pin)
[![npm downloads](https://img.shields.io/npm/dm/dsh-session-pin)](https://www.npmjs.com/package/dsh-session-pin)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibility

| सतह | स्थिति |
|---|---|
| Harness | DeepSeek Harness `0.1.1-rc.2` (client packages `0.1.1-rc.2`) |
| Node | `>= 22` (डेवलपमेंट आधार) |
| प्लेटफ़ॉर्म | Web GUI (दोहरा चेहरा: host + browser) |
| मॉडल | कोई भी (केवल UI — कोई मॉडल ट्रैफ़िक नहीं, कोई सत्र घटना नहीं) |
| `session/pin` इवेंट | प्री-फ़्लाइट गेट: उन hosts पर कभी नहीं लिखे जाते जिनका इवेंट शब्दकोश प्रकार नहीं जानता और जिनके append ने `ignorable` मार्कर गिरा दिया (`0.1.2-alpha.5`); projection settings cache पर degrade हो जाता है 0.1.2-alpha.5 (2026-09-02 को अनुकूलित): सत्र लिफ़ाफ़ा अपना ignorable फ़ील्ड केवल संग्रहीत-लॉग पठन संगतता के लिए रखता है - Session.append अभी भी इसे स्टैम्प नहीं कर सकता, इसलिए गेट व्यवहार अपरिवर्तित है। |

## What you get

`dsh-session-pin` उन बातचीतों को साइडबार में शीर्ष पर रखता है जो मायने रखती हैं और उन्हें रंग देता है ताकि एक नज़र में मिल जाएँ:

- **पिन के दो स्तर** — पूरे workspace और अलग-अलग session पिन करें; पिन किया workspace workspace सूची में और पिन किया session अपने खाते में सबसे आगे चला जाता है।
- **हर पिन का पंक्ति-रंग** — हर पिन के बाद का रंग बटन 8-रंग की preset palette घुमाता है (Shift+क्लिक साफ़ करता है); पंक्ति को बाईं ओर एक accent पट्टी और पारभासी रंगत मिलती है।
- **चार पिन सतहें** — हर पंक्ति पर एक hover `[pin][रंग]` जोड़ी, session हेडर में एक टॉगल, pinned पैनल वाली sidebar फुट क्रिया, और हर-ब्राउज़र टिकाऊ pinning जो रीस्टार्ट के बाद भी pin और रंग बनाए रखता है।
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

- **Host आधा** (`src/index.ts`) — टिकाऊ `session-pin` settings namespace पंजीकृत करता है (दो पिन की गई id सूचियाँ, दो रंग मानचित्र और आयोजक state, साथ में host नीति `maxPins`/`reorderOnLoad`/`pruneStale`); कोई session event नहीं, कोई मॉडल ट्रैफ़िक नहीं।
- **Browser आधा** (`src/client.ts`) — एक framework-मुक्त `PinStore` (settings transport, टैब-सिंक वाले versioned `localStorage` दस्तावेज़ पर degrade), एक `PinController` (दो-स्तरीय toggle / रंग चक्र / prune / reorder स्टेट मशीन) और UI जोड़ता है: पंक्ति ओवरले, वैकल्पिक पंक्ति-slot पंजीकरण, हेडर टॉगल, फुट क्रिया और pinned पैनल। क्रम `ctx.workspaces` से होकर जाता है।
- **log-समर्थित लेखन चैनल** — बिल्ट-इन `dsh-session-pin` सेवा माउंट करने वाले builds पर, हर session टॉगल पहले `session.setPinned` RPC से commit होता है (`session/pin` इवेंट log canonical residence है) और settings store में mirror होता है; विफल या धीमा RPC सीधे settings लेखन पर degrade हो जाता है।
- **log-समर्थित projection पठन** — `enableLogBacking` (host Config, fail-closed डिफ़ॉल्ट बंद) एक reader माउंट करता है जो लाइव `session/pin` इवेंट्स को canonical pin सेट में fold करता है और folded `pinned`/`colors` को settings namespace में mirror करता है। इवेंट schema, शुद्ध fold (`foldPinEvents`) और प्री-फ़्लाइट-गेटेड append seam (`PinLogAppender`) `src/pin-log.ts` में रहते हैं: host का ज्ञात इवेंट शब्दकोश और उसका `ignorable` append मार्कर **पहली लेखन से पहले** जाँचे जाते हैं (परिणाम प्रति-प्रक्रिया कैश), इसलिए जो hosts इवेंट को सुरक्षित नहीं ले जा सकते — `0.1.2-alpha.5` पढ़ने पर अज्ञात प्रकारों को fail-closed अस्वीकार करता है — उन्हें एक भी लेखन नहीं मिलता; settings/localStorage store संगतता व degradation पथ बना रहता है।
- **क्लाइंट seam** — browser आधा `SessionId`/`WorkspaceId` brands को `@deepseek-ai/dsh-client-connection` से पढ़ता है (हटाया गया `dsh-client-runtime` पैकेज वर्तमान hosts पर मौजूद नहीं है); session-हेडर slot की standard-kit सीटें स्थानीय structural contract के रूप में टाइप होती हैं। `0.1.2-alpha.5` hosts पर `sessions.row.action` पंक्ति slot घोषित नहीं है, इसलिए session पंक्तियाँ DOM ओवरले पर fallback करती हैं और slot पंजीकरण टाला रहता है।
- **बिल्ड** — esbuild host ESM आधा और वेब बूट फ़ैक्टरी (`window.__ModuleLoader__.load({ id, factory })`) में लिपटा client CJS आधा उत्सर्जित करता है; `react` shell के अपने React पर externalize होता है, और कोई `@deepseek-ai/*` मान-आयात ब्राउज़र bundle में रिसने पर purity gate बिल्ड विफल कर देता है।

**उपयोग किए गए एक्सटेंशन पॉइंट:** `settings` (host); `sessions`, `workspaces`, `settingsScope`, `connection`, `remote`, `slots` (client); `locale` (client, वैकल्पिक); `conversation.session.header.actions`, `sidebar.footer.action`, `shell.overlay`, और upstream का `sessions.row.action` पंक्ति slot जब घोषित हो (`0.1.2-alpha.5` hosts इसे घोषित नहीं करते — वहाँ session पंक्तियाँ DOM ओवरले से ढकती हैं)। **मॉडल-दृश्य प्रभाव: कोई नहीं** — केवल-UI plugin: न कोई session event जोड़ता है और न किसी मॉडल अनुरोध में token।

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
- **अनइंस्टॉल**: `dsh plugin --profile web remove dsh-session-pin` (या profile patch से पंक्ति हटाएँ; `settings.yaml` का `session-pin` अनुभाग भी हटाया जा सकता है)।

## Configuration

सभी ट्यूनेबल Schemastery `Config` फ़ील्ड हैं (cordis.yml से बदले जा सकते हैं)। `cordis.patch.yml` नीचे दिए डिफ़ॉल्ट के साथ bundle माउंट करता है।

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
| `session-pin` settings namespace | host सेवा | pins, रंग और आयोजक state का हर-ब्राउज़र टिकाऊ भंडार |

## Permissions & data

- **अनुमतियाँ**: `dshWorkshop` manifest `browser:local-storage`, `settings:read` और `settings:write` घोषित करता है।
- **डेटा**: pins, रंग और आयोजक state हर ब्राउज़र में `session-pin` settings namespace में रहते हैं; जहाँ web proxy namespace नहीं परोसता वहाँ versioned `localStorage` दस्तावेज़ (v1 दस्तावेज़ migrate होते हैं) पर degrade हो जाते हैं। कुछ भी अपलोड नहीं होता।
- **सत्र लॉग**: डिफ़ॉल्ट रूप से कोई नहीं — यह plugin न कोई session event जोड़ता है और न किसी मॉडल अनुरोध में token। `enableLogBacking` चालू होने पर, host केवल-log `session/pin` इवेंट (upstream `session.setPinned` RPC द्वारा लिखित) को canonical pin projection में fold करता है; `PinLogAppender` अपनी लेखन को प्री-फ़्लाइट गेट करता है, इसलिए जो hosts इवेंट नहीं ले जा सकते (`0.1.2-alpha.5`) उन्हें एक भी लेखन नहीं मिलता। मॉडल-दृश्य प्रभाव फिर भी कोई नहीं।

## Security boundaries

- **केवल UI।** कोई मॉडल-दृश्य प्रभाव नहीं, कोई नेटवर्क नहीं, कोई subprocess नहीं; हर सतह पुरानी आधाररेखाओं पर सहज रूप से degrade होती है।
- **टिकाऊ और सीमित state।** pins और रंग हटाई गई entities के साथ prune हो जाते हैं (`pruneStale`); `maxPins` हर स्तर की पिन संख्या सीमित करता है।
- **रीड-ओनली स्वास्थ्य।** स्वास्थ्य सारांश सार्वजनिक session snapshot से केवल गणना व दिशा व्युत्पन्न करता है और कुछ वापस नहीं लिखता।

## Known limitations

- **स्थायित्व का दायरा** — जहाँ web proxy `session-pin` namespace नहीं परोसता, वहाँ pins और रंग ब्राउज़र-स्थानीय `localStorage` पर fallback करते हैं; upstream द्वारा namespace एक्सपोज़ करते ही host पंजीकरण स्वचालित रूप से टिकाऊ भंडार बन जाता है। `0.1.2-alpha.5` hosts पर प्री-फ़्लाइट गेट log appends को पूरी तरह बंद कर देता है (fail-closed इवेंट शब्दकोश ऐसे logs को अस्वीकार कर देता), इसलिए projection वहाँ settings cache पर degrade हो जाता है।
- **क्रम का दायरा** — पिन की स्थिति केवल **Manual** क्रम में स्थिर है; **Updated** क्रम में कोर की गतिविधि-प्रमोशन सक्रिय sessions को फिर से आगे कर देती है, और `reorderOnLoad` लोड पर उपसर्ग फिर से लागू करता है।
- **दूरस्थ ब्राउज़र** — baseline पर settings RPC केवल loopback हैं; दूरस्थ ब्राउज़र ब्राउज़र-स्थानीय `localStorage` पर fallback करते हैं।
- **पंक्ति बैज fallback** — जहाँ upstream का पंक्ति slot उपलब्ध नहीं है, session पंक्तियाँ शीर्षक पाठ से मेल खाती हैं; डुप्लिकेट शीर्षकों पर बैज हर मेल खाती पंक्ति पर दिखता है और पहले मेल को टॉगल करता है (कॉस्मेटिक)।
- **पंक्ति DOM निर्भरता** — ओवरले कोर पंक्तियों की `role="treeitem"` संरचना पर निर्भर है और उसे upstream के UI बदलावों का अनुसरण करना होगा।

## Roadmap

- राइट-क्लिक / पंक्ति-मेनू में «पिन» प्रविष्टि (कोर के पंक्ति-स्तरीय मेनू slot की आवश्यकता; पंक्ति बैज slot अब upstream में है)।
- ~~विहित स्थान: एक log-समर्थित `session/pin` event + `pin` projection + write RPC (upstream) — तब settings namespace टिकाऊ भंडार से हट जाता है और plugin `useProjection('pin')` का उपभोग करता है।~~ **लागू (P0):** plugin में अब `session/pin` event schema, शुद्ध projection fold (`foldPinEvents`), प्री-फ़्लाइट-गेटेड append seam (`PinLogAppender`) और एक host projection reader (`enableLogBacking`) है जो लाइव `session/pin` इवेंट्स को settings cache में वापस fold करता है; settings/localStorage संगतता व degradation पथ बने रहते हैं, और सक्षम होने पर log canonical है।
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

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) द्वारा अनुरक्षित [33 DeepSeek Harness प्लगइनों](https://github.com/PerryLink) में से एक है। अगर यह आपकी मदद करता है, तो बाकी भी करेंगे:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | अनुमोदन श्रृंखला पर द्वितीय-मॉडल स्वतः-समीक्षा, डिफ़ॉल्ट रूप से विफल-बंद | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | वेब UI साइडबार, संदेश और अवरोधन के साथ टिकाऊ पृष्ठभूमि चाइल्ड एजेंट | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | DeepSeek Harness के लिए लागत प्रशासन: बजट, कार्बन और विलंबता एक पैनल में। | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Claude Code /rewind-समतुल्य: स्नैपशॉट, सत्र फ़ॉर्क, एक-बार पुनर्स्थापना | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Claude Code सत्र, मेमोरी, कौशल और CLAUDE.md को DSH में स्थानांतरित करें | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | DeepSeek Harness के लिए क्रॉस-प्लेटफ़ॉर्म नेटिव डेस्कटॉप नियंत्रण — Windows पहले। | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | वेब कंपोज़र के लिए टर्मिनल-शैली इनपुट इतिहास: तीर, Ctrl+R खोज | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | डेटासेट गुणवत्ता जाँच व उद्धरण सत्यापन (यहाँ उपभोग किया गया वैकल्पिक संख्या-सेतु) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | DeepSeek Harness के लिए प्रॉम्प्ट-इंजेक्शन, जेलब्रेक और सीक्रेट-लीक रक्षा। | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | इंजीनियरिंग-अनुशासन रक्षक: आवश्यकताओं की पूछताछ, परीक्षण द्वार, प्रतिद्वंद्वी समीक्षा | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | DeepSeek Harness के लिए एकीकृत स्थैतिक-छवि निर्माण रूटिंग। | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | DeepSeek Harness के लिए रीड-ओनली प्रदर्शन डायग्नोस्टिक्स। | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | चीनी सार्वजनिक म्यूचुअल फंड के लिए नियतात्मक अनुसंधान रिपोर्ट | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | DSH के लिए GitHub PR/issues एकीकरण, हर लेखन अनुमोदन-द्वारित | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | उद्योग-अनुसंधान ऑर्केस्ट्रेशन जो इस प्लगिन के `ctx.researchReport.assemble` से डिलीवरेबल सील करता है | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | DeepSeek Harness के लिए स्थानीय दस्तावेज़ ज्ञानकोश। | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | DeepSeek Harness के लिए स्थानीय-मॉडल (Ollama) एकीकरण। | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | भाषा सर्वरों पर LSP निदान, फ़ॉर्मेटिंग, पूर्णता, कोड क्रियाएँ और नाम बदलना | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | PII मास्किंग मिडलवेयर: मॉडल सीमा पर अनाम करें, डिस्प्ले लेयर पर पुनर्स्थापित करें | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | केवल-पढ़ने वाला MCP रनटाइम पैनल: /mcp कमांड + स्थिति, टूल और त्रुटियों वाला Settings टैब | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | अनुमोदन-द्वारित क्रॉस-सत्र मेमोरी: ctx.memory सीम + SQLite + मेमोरी टूल | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | DeepSeek Harness के लिए OpenTelemetry और Langfuse अवलोकनीयता निर्यातक। | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Claude Code outputStyles-समतुल्य रनटाइम शैली बदलाव | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | ऑडिट के साथ Claude Code-शैली घोषणात्मक allow/deny/ask अनुमति नियम | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | माँग पर एजेंट कौशल के रूप में प्लगइन-विकास ज्ञान आधार | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | सामग्री-पता साक्ष्य और सीलबंद संस्करणों वाला सत्यापन-योग्य अनुसंधान-रिपोर्ट इंजन | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | DeepSeek Harness प्लगिनों की बहु-आयामी गुणवत्ता स्कोरिंग। | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | DeepSeek Harness के लिए क्रॉस-डिवाइस सत्र सिंक — आपके सत्र स्टोर का एक समर्पित git मिरर। | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | सुरक्षा-ऑडिट कौशल पैक: गुप्त स्कैन, निर्भरता और आपूर्ति-श्रृंखला समीक्षा | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | DeepSeek Harness के लिए आवाज़-प्रथम सत्र लूप: बोलें और उत्तर सुनें। | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | DeepSeek Harness प्लगिनों के लिए पृथक इंस्टॉल-एंड-स्मोक टेस्ट ड्राइव। | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | DeepSeek Harness के लिए वेंडर पैरामीटर अनुवाद और नियतात्मक JSON मरम्मत। | |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-session-pin योगदानकर्ता
