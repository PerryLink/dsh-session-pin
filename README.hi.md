<div align="center">

# 📌 dsh-session-pin

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
| Harness | DeepSeek Harness `0.1.0-rc.6` (client packages `0.1.0-rc.6`) |
| Node | `>= 22` (डेवलपमेंट आधार) |
| प्लेटफ़ॉर्म | Web GUI (दोहरा चेहरा: host + browser) |
| मॉडल | कोई भी (केवल UI — कोई मॉडल ट्रैफ़िक नहीं, कोई सत्र घटना नहीं) |

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

- **Boards** — pins नामित समूहों में जुड़ते हैं; पैनल हर board का एक चिप (साथ में «All») दिखाता है जो सूची को फ़िल्टर करता है।
- **टैग और दृश्य** — entities पर अधिकतम 8 टैग (हर एक ≤24 अक्षर); फ़िल्टर बार टेक्स्ट और टैग से मिलाता है, और कोई भी फ़िल्टर स्थिति एक नामित दृश्य (अधिकतम 20) बनकर एक क्लिक में बदल जाती है।
- **स्वास्थ्य सारांश** — हर पिन की गई session पंक्ति में सार्वजनिक session snapshot से व्युत्पन्न रीड-ओनली, सैनिटाइज़्ड पंक्ति (`N msgs · you|ai · सापेक्ष समय`) जुड़ती है — केवल गणना व दिशा, सामग्री कभी नहीं।
- **`/goto <कीवर्ड>`** — कम्पोज़र में `/goto` से शुरू होने वाली पंक्ति + Enter: अद्वितीय मिलान खोलता है, कई मिलान सूची देते हैं, कोई मिलान नहीं तो स्पष्टीकरण। कमांड पंक्ति मॉडल तक कभी नहीं पहुँचती।

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

## Tools & surfaces

| सतह | प्रकार | टिप्पणियाँ |
|---|---|---|
| `[pin][रंग]` पंक्ति नियंत्रण | UI slot / DOM ओवरले | हर session और workspace पंक्ति पर hover नियंत्रण |
| session हेडर टॉगल | UI slot | हेडर की क्रिया-पंक्ति में वही नियंत्रण, session id से जोड़ा गया |
| sidebar फुट + pinned पैनल | UI slot / ओवरले | पिन किए workspace और session (सबसे नया pin पहले) रंग-बिंदुओं के साथ सूचीबद्ध करता है |
| `/goto <कीवर्ड>` | command | शीर्षक/टैग से कम्पोज़र त्वरित-छलांग; पंक्ति मॉडल तक कभी नहीं पहुँचती |
| `session-pin` settings namespace | host सेवा | pins, रंग और आयोजक state का हर-ब्राउज़र टिकाऊ भंडार |

## Permissions & data

- **अनुमतियाँ**: `dshWorkshop` manifest `browser:local-storage`, `settings:read` और `settings:write` घोषित करता है।
- **डेटा**: pins, रंग और आयोजक state हर ब्राउज़र में `session-pin` settings namespace में रहते हैं; जहाँ web proxy namespace नहीं परोसता वहाँ versioned `localStorage` दस्तावेज़ (v1 दस्तावेज़ migrate होते हैं) पर degrade हो जाते हैं। कुछ भी अपलोड नहीं होता।
- **सत्र लॉग**: कोई नहीं — यह plugin न कोई session event जोड़ता है और न किसी मॉडल अनुरोध में token।

## Security boundaries

- **केवल UI।** कोई मॉडल-दृश्य प्रभाव नहीं, कोई नेटवर्क नहीं, कोई subprocess नहीं; हर सतह पुरानी आधाररेखाओं पर सहज रूप से degrade होती है।
- **टिकाऊ और सीमित state।** pins और रंग हटाई गई entities के साथ prune हो जाते हैं (`pruneStale`); `maxPins` हर स्तर की पिन संख्या सीमित करता है।
- **रीड-ओनली स्वास्थ्य।** स्वास्थ्य सारांश सार्वजनिक session snapshot से केवल गणना व दिशा व्युत्पन्न करता है और कुछ वापस नहीं लिखता।

## Known limitations

- **स्थायित्व का दायरा** — जहाँ web proxy `session-pin` namespace नहीं परोसता, वहाँ pins और रंग ब्राउज़र-स्थानीय `localStorage` पर fallback करते हैं; upstream द्वारा namespace एक्सपोज़ करते ही host पंजीकरण स्वचालित रूप से टिकाऊ भंडार बन जाता है।
- **क्रम का दायरा** — पिन की स्थिति केवल **Manual** क्रम में स्थिर है; **Updated** क्रम में कोर की गतिविधि-प्रमोशन सक्रिय sessions को फिर से आगे कर देती है, और `reorderOnLoad` लोड पर उपसर्ग फिर से लागू करता है।
- **दूरस्थ ब्राउज़र** — baseline पर settings RPC केवल loopback हैं; दूरस्थ ब्राउज़र ब्राउज़र-स्थानीय `localStorage` पर fallback करते हैं।
- **पंक्ति बैज fallback** — जहाँ upstream का पंक्ति slot उपलब्ध नहीं है, session पंक्तियाँ शीर्षक पाठ से मेल खाती हैं; डुप्लिकेट शीर्षकों पर बैज हर मेल खाती पंक्ति पर दिखता है और पहले मेल को टॉगल करता है (कॉस्मेटिक)।
- **पंक्ति DOM निर्भरता** — ओवरले कोर पंक्तियों की `role="treeitem"` संरचना पर निर्भर है और उसे upstream के UI बदलावों का अनुसरण करना होगा।

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

## License

[Apache License 2.0](LICENSE) © 2026 dsh-session-pin योगदानकर्ता
