# 📌 dsh-session-pin

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">中文</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md">Português</a> ·
  <a href="README.hi.md">हिन्दी</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="लाइसेंस: Apache-2.0">
  <img src="https://img.shields.io/npm/v/dsh-session-pin" alt="npm संस्करण">
  <img src="https://img.shields.io/npm/dm/dsh-session-pin" alt="npm डाउनलोड">
  <img src="https://github.com/PerryLink/dsh-session-pin/actions/workflows/ci.yml/badge.svg" alt="CI">
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/topic-dsh--plugin-2ea44f.svg" alt="Topic: dsh-plugin"></a>
  <img src="https://img.shields.io/badge/DSH-0.1.0--rc.6-3884ff.svg" alt="DSH आधाररेखा: 0.1.0-rc.6">
  <img src="https://img.shields.io/github/stars/PerryLink/dsh-session-pin?style=flat" alt="GitHub स्टार">
</p>

> **जो बातचीत मायने रखती है, उसे पिन करें — और उन्हें रंग दें ताकि एक नज़र में मिल जाएँ।** [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) के लिए एक दोहरे-चेहरे (host + browser) वाला plugin है, जिसमें pin के दो स्तर (workspace और session), हर pin के बाद एक रंग बदलने वाला बटन जो पंक्ति को रंग देता है, और चार pin सतहें हैं: हर पंक्ति पर एक hover [pin][रंग] जोड़ी, session हेडर में एक pin टॉगल, pinned पैनल वाली एक sidebar फुट क्रिया, और हर-ब्राउज़र टिकाऊ pinning जो रीस्टार्ट के बाद भी pin और रंग बनाए रखता है।

## पिन क्यों?

session सूचियाँ हाल की गतिविधि के क्रम में सजती हैं: जिस बातचीत पर आप पूरे सप्ताह भरोसा करते हैं वह धीरे-धीरे नीचे तक डूबती जाती है, और हर नई चैट उसे और दबा देती है। Manual क्रम में पंक्तियाँ खींचना काम करता है, पर कोई उसे खोजता नहीं — और गतिविधि पर फिर से क्रमबद्ध हो जाने वाले पिन किए चैट की शिकायत दूसरे कोडिंग एजेंटों के उपयोगकर्ता सबसे ज़्यादा करते हैं। `dsh-session-pin` आपको इसकी जगह एक-क्लिक का अनुभव देता है:

```
┌─ Workspaces ────────────────────────────┐
│ 🎨 Workbench            ███             │  ← पिन किया workspace, लाल रंग
│   📌 Implement login flow         3h    │  ← पिन किया session, टील रंग
│     Fix the auth bug              1h    │  ← hover पर ग्रे pin + रंग बटन दिखते हैं
│   Refactor the DB layer           2d    │
└─────────────────────────────────────────┘
```

## ✨ विशेषताएँ

- 🧷 **पंक्ति नियंत्रण** — hover करने पर session शीर्षक के बाईं ओर एक ग्रे pin धीरे-धीरे उभरता है; पिन की गई पंक्तियाँ ठोस अम्बर pin बनाए रखती हैं। जहाँ build upstream का प्रति-पंक्ति slot (`sessions.row.action`) घोषित करती है, वहाँ [pin][रंग] जोड़ी उसी के ज़रिए प्रामाणिक session id के साथ रेंडर होती है — और DOM ओवरले session पंक्तियों को पूरी तरह छोड़ देता है, इसलिए एक पंक्ति पर कभी दो pin-सेट नहीं दिख सकते। बिना slot वाली आधाररेखाओं पर DOM ओवरले session पंक्तियों को शीर्षक के आधार पर कवर करता है।
- 📂 **Workspace pins** — workspace हेडर पंक्तियों को वही [pin][रंग] जोड़ी मिलती है (upstream slot वहाँ रेंडर नहीं होता, इसलिए ओवरले उन्हें host-द्वारा-अद्वितीय workspace नाम से मिलाकर कवर करता है)। workspace पिन करने पर वह सार्वजनिक `workspace.insertBefore` RPC के ज़रिए workspace सूची में सबसे आगे चला जाता है।
- 🎨 **पंक्ति रंग** — हर pin के बाद का रंग बटन क्लिक करने पर 8-रंग की preset palette घुमाता है (Shift+क्लिक रंग साफ़ करता है)। रंगीन पंक्ति को बाईं ओर एक accent पट्टी और पारभासी रंगत मिलती है — session और workspace स्वतंत्र रूप से, ताकि किसी क्षेत्र को एक नज़र में पहचाना जा सके। रंग pin के साथ persist होते हैं और हटाई गई इकाइयों के साथ prune हो जाते हैं।
- 📌 **हेडर टॉगल** — वही pin नियंत्रण session हेडर की क्रिया-पंक्ति (`conversation.session.header.actions`) में रहता है, जिसे framework-द्वारा-हल किए गए session id से जोड़ा जाता है: डुप्लिकेट शीर्षक और खाली session यहाँ सही ढंग से पिन होते हैं।
- 🗂 **पिन पैनल** — sidebar की एक फुट क्रिया एक फ़्लोटिंग पैनल खोलती है जो पिन किए workspace और session को सूचीबद्ध करता है (सबसे नया pin पहले) और हर पंक्ति का रंग-बिंदु दिखाता है; किसी एक पर क्लिक करने से उस पर पहुँच जाते हैं। Escape या बाहर क्लिक करने से वह बंद हो जाता है।
- 📐 **शीर्ष क्रम** — पिन करने पर session सार्वजनिक `workspace.insertSessionBefore` RPC के ज़रिए अपने workspace खाते में सबसे आगे चली जाती है, और पिन किया workspace workspace सूची में सबसे आगे चला जाता है; `reorderOnLoad` सूचियाँ लोड होने के बाद दोनों पिन किए उपसर्गों को फिर से लागू करता है (idempotent, इसलिए यह कोर के अपने पुनः-क्रम से कभी नहीं लड़ता)। कोर के **Manual** क्रम में स्थिति यथावत रहती है।
- 💾 **स्थायी पिनिंग** — host आधा टिकाऊ `session-pin` settings namespace पंजीकृत करता है (जो builds समर्थन करते हैं उनमें `settings.register({ expose: true })` से wire-exposed घोषित); browser आधा मानक `settings.*` RPC के ज़रिए पढ़ता है। जिन builds का web proxy plugin namespace नहीं परोसता, वहाँ browser आधा एक versioned `localStorage` दस्तावेज़ पर fallback करता है (v1 दस्तावेज़ migrate हो जाते हैं), और `storage` events के ज़रिए टैब के बीच sync होता है।
- 📡 **log-समर्थित लेखन चैनल** — जो builds बिल्ट-इन `dsh-session-pin` सेवा माउंट करते हैं, वहाँ हर session टॉगल पहले `session.setPinned` RPC से commit होता है (`session/pin` इवेंट log ही canonical residence है) और commit को settings store में mirror किया जाता है, जिससे क्रमबद्ध सूची, पैनल और workspace पुनः-क्रम सुसंगत रहते हैं। विफल या धीमा RPC सीधे settings लेखन पर degrade हो जाता है; अगली कनेक्शन पीढ़ी इसे फिर सक्षम करती है। Host द्वारा `pin` projection परोसे जाने पर session हेडर टॉगल उसे पढ़ता है — अलग-अलग डिवाइसों के commits उसी के ज़रिए converge होते हैं। workspace pins और रंग plugin का स्थानीय state हैं और हमेशा store में लिखे जाते हैं।
- 🔢 **वैकल्पिक सीमा** — `config.maxPins` हर स्तर के लिए पिन की संख्या सीमित करता है (डिफ़ॉल्ट `0` = असीमित); सीमा पार करने पर बैज पर एक inline सीमा-संकेत दिखता है।
- 🧹 **स्व-उपचार अवस्था** — सूचियाँ तैयार होते ही `pruneStale` उन pins और रंगों को हटा देता है जिनके workspace/session हटाए या संग्रहीत कर दिए गए हैं।
- 🌍 **स्थानीयकृत UI** — बैज, रंग बटन, हेडर, फुट और पैनल के पाठ locale सेवा के ज़रिए 中文 और English में उपलब्ध हैं; इसके बिना वाली रचनाएँ English fallback बनाए रखती हैं। Readmes: English · 中文 · Español · Português · हिन्दी.
- 🧩 **कोर में शून्य बदलाव** — स्टॉक DSH Web GUI के लिए एक स्वतंत्र plugin; हर नई सतह पुरानी आधाररेखाओं पर सहज रूप से degrade हो जाती है।

## 🚀 त्वरित शुरुआत

1. **इंस्टॉल करें** — अपने प्रोफ़ाइल के `cordis.yml` में plugin जोड़ें:

```yaml
plugins:
  'dsh-session-pin':
    path: /path/to/dsh-session-pin
    config:
      maxPins: 5        # optional; 0 = unlimited (default)
      reorderOnLoad: true   # optional; re-assert pinned order after load (default)
      pruneStale: true      # optional; drop pins of deleted sessions (default)
```

> **Loader entry id।** loader पूरे root include ट्री में entry ids को
> deduplicate करता है। जिन harness builds का `dsh-base` bundle बिल्ट-इन host
> सेवा `@deepseek-ai/dsh-session-pin` माउंट करता है (entry id `session-pin` —
> log-समर्थित पिन स्थिति और `session.setPinned` RPC), वहाँ इस plugin को एक
> अलग entry id दें, जैसे प्रोफ़ाइल patch पंक्ति में `id: session-pin-ui`।
> डुप्लिकेट `session-pin` id से पूरा बूट "duplicate loader entry id" के साथ
> विफल हो जाता है। plugin का आंतरिक cordis `name` और उसका settings
> namespace `session-pin` ही रहते हैं — केवल प्रोफ़ाइल entry id अलग होना चाहिए।

2. **बिल्ड करें** (क्लाइंट bundle गायब होने पर वेब ऐप शुरू होने से इनकार कर देता है):

```sh
pnpm install
pnpm run build      # lib/index.js + lib/client.js
```

3. **रीस्टार्ट करें** `dsh web` और sidebar में किसी भी पंक्ति पर hover करें — pin बैज (और रंग बटन) शीर्षक के बाईं ओर दिखता है। पिन करने के लिए क्लिक करें; रंग बटन पर क्लिक करके रंग घुमाएँ; रंग साफ़ करने के लिए Shift+क्लिक; session हेडर से इसे फिर टॉगल करें; sidebar फुट से पिन की सूची खोलें।

**अनइंस्टॉल** — `cordis.yml` से plugin पंक्ति हटाएँ और रीस्टार्ट करें। `settings.yaml` से `session-pin` अनुभाग भी हटाया जा सकता है; और कुछ नहीं लिखा जाता।

## ⚙️ कॉन्फ़िगरेशन

| कुंजी | प्रकार | डिफ़ॉल्ट | अर्थ |
|---|---|---|---|
| `maxPins` | पूर्णांक | `0` | हर स्तर के लिए पिन की गई इकाइयों की अधिकतम संख्या (session और workspace का अपना-अपना बजट); `0` = असीमित। अनपिन हमेशा काम करता है। |
| `reorderOnLoad` | बूलियन | `true` | session/workspace सूचियाँ तैयार होने पर और workspace बदलावों पर पिन किए उपसर्ग (सबसे नया pin पहले) फिर से लागू करता है। |
| `pruneStale` | बूलियन | `true` | तैयार सूची से गायब इकाइयों के pins और रंग हटा देता है (हटाए गए/संग्रहीत)। |
| `enableBoards` | boolean | `true` | साइडबार पैनल में पिन समूह (boards) सक्षम करें। |
| `enableTags` | boolean | `true` | सत्र/कार्यक्षेत्र टैग और पैनल फ़िल्टर बार सक्षम करें। |
| `enableViews` | boolean | `true` | सहेजे गए फ़िल्टर दृश्य सक्षम करें। |
| `enableHealth` | boolean | `true` | प्रति-पिन सत्र स्वास्थ्य सारांश सक्षम करें (रीड-ओनली, सैनिटाइज़्ड)। |
| `enableGoto` | boolean | `true` | कम्पोज़र का `/goto <कीवर्ड>` कमांड सक्षम करें। |

## 🧭 नेविगेशन आयोजक

पिनिंग के ऊपर: **boards** (पिन नामित समूहों में; पैनल के चिप समूह-अनुसार फ़िल्टर करते हैं), **टैग और सहेजे गए दृश्य** (प्रति एंटिटी अधिकतम 8 टैग; फ़िल्टर बार टेक्स्ट व टैग से मिलाता है, और कोई भी फ़िल्टर स्थिति एक क्लिक में नामित दृश्य बन जाती है), **स्वास्थ्य सारांश** (प्रत्येक पिन किए सत्र की पंक्ति में सार्वजनिक सत्र स्नैपशॉट से व्युत्पन्न रीड-ओनली सैनिटाइज़्ड पंक्ति — संदेश संख्या, अंतिम दिशा, सापेक्ष समय — केवल गणना व दिशा, सामग्री कभी नहीं) और **`/goto <कीवर्ड>`** (कम्पोज़र में `/goto` से शुरू होने वाली पंक्ति + Enter: अद्वितीय मिलान खोलता है, कई मिलान सूची देते हैं, कोई मिलान नहीं तो स्पष्टीकरण; कमांड पंक्ति मॉडल तक कभी नहीं पहुँचती)। सारा डेटा ब्राउज़र-लोकल रहता है।
## 🧠 यह कैसे काम करता है

- **Host आधा** (`src/index.ts`) — `session-pin` settings namespace (`{ pinned, workspacePinned, colors, workspaceColors, maxPins, reorderOnLoad, pruneStale }`) पंजीकृत करता है, और नीति composition आधार परत पर चलती है। कोई session event नहीं, कोई मॉडल ट्रैफ़िक नहीं।
- **Browser आधा** (`src/client.ts`) — एक framework-मुक्त `PinStore` (settings transport, जो टैब के बीच sync वाले versioned `localStorage` दस्तावेज़ पर degrade हो जाता है), एक `PinController` (दो-स्तरीय toggle / रंग चक्र / prune / reorder स्टेट मशीन) और UI को जोड़ता है: पंक्ति ओवरले (workspace पंक्तियाँ हमेशा; session पंक्तियाँ केवल तब जब पंक्ति slot घोषित न हो), वैकल्पिक पंक्ति-slot पंजीकरण, हेडर टॉगल, sidebar फुट क्रिया और ओवरले पैनल। क्रम `ctx.workspaces` से होकर जाता है; पंक्ति रंगत शुद्ध CSS है (रंग बटन की `data-color` क्लास पर आधारित `:has()`)।
- **बिल्ड** — esbuild host का ESM आधा और वेब बूट फ़ैक्टरी (`window.__ModuleLoader__.load({ id, factory })`) में लिपटा क्लाइंट CJS आधा उत्सर्जित करता है; `react` को मॉड्यूल-टेबल seed word पर externalize किया जाता है ताकि bundle shell के अपने React से रेंडर हो। कोई `@deepseek-ai/*` मान-आयात ब्राउज़र bundle में रिसने पर एक purity gate बिल्ड को विफल कर देता है।

**उपयोग किए गए एक्सटेंशन पॉइंट:** `settings` (host); `sessions`, `workspaces`, `settingsScope`, `connection`, `remote`, `slots` (client); `locale` (client, वैकल्पिक); `conversation.session.header.actions`, `sidebar.footer.action`, `shell.overlay`, और upstream का `sessions.row.action` पंक्ति slot जब घोषित हो। **मॉडल-दृश्य प्रभाव: कोई नहीं** — यह केवल-UI plugin है: यह न कोई session event जोड़ता है और न किसी मॉडल अनुरोध में token।

## 📦 संगतता

| परत | आधाररेखा |
|---|---|
| DeepSeek Harness | npm `@deepseek-ai/dsh@0.1.0-rc.6` पीढ़ी (client packages `0.1.0-rc.6`); नई builds पंक्ति slot, wire-एक्सपोज़्ड settings और `session/pin` projection को स्वचालित रूप से सक्रिय करती हैं |
| Cordis peer | `@deepseek-ai/cordis: ^4.0.1` |
| Node (डेवलपमेंट) | ≥ 22 |

## 🧪 डेवलपमेंट

```sh
pnpm install
pnpm run typecheck  # tsc --noEmit
pnpm run test       # vitest unit tests (pin-core, store, controller, overlay, host registration)
pnpm run build      # dual-half build + client-bundle purity check
node scripts/verify-live.mjs   # live check against a running `dsh web` (DSH_CHECKOUT env)
```

## 🗺️ रोडमैप

- राइट-क्लिक / पंक्ति-मेनू में «पिन» प्रविष्टि (कोर के पंक्ति-स्तरीय मेनू slot की आवश्यकता; पंक्ति बैज slot अब upstream में है)।
- विहित स्थान: एक log-समर्थित `session/pin` event + `pin` projection + write RPC (upstream) — तब settings namespace टिकाऊ भंडार की भूमिका से हट जाता है और plugin `useProjection('pin')` का उपभोग करता है।
- विहित स्थान मौजूद होने पर एक पूर्ण रंग-चयनकर्ता popover (मनपसंद रंग); आज का चक्र बटन preset palette को कवर करता है।

## ⚠️ ज्ञात सीमाएँ

- **स्थायित्व का दायरा** — जिन builds का web proxy plugin settings namespace नहीं परोसता, वहाँ browser आधा pins और रंगों को एक versioned `localStorage` दस्तावेज़ (ब्राउज़र-स्थानीय) में रखता है, जब तक upstream namespace को एक्सपोज़ नहीं कर देता (नई builds में `settings.register({ expose: true })` से घोषित)। host-साइड पंजीकरण पहले से तैयार है और स्वचालित रूप से टिकाऊ भंडार बन जाता है।
- **क्रम का दायरा** — पिन की स्थिति केवल **Manual** क्रम में स्थिर है; **Updated** क्रम में कोर की गतिविधि-प्रमोशन सक्रिय session को फिर से आगे कर देती है, और `reorderOnLoad` लोड और workspace बदलावों पर उपसर्गों को फिर से लागू करता है। Ungrouped और फ़्लैट-सूची दृश्यों में host-साइड खाता नहीं होता, इसलिए वहाँ session की स्थिति persist नहीं होती (बैज, रंग और pin स्थिति फिर भी काम करती हैं)। workspace क्रम रजिस्ट्री प्रदर्शन-क्रम से persist होता है।
- **दूरस्थ ब्राउज़र** — baseline पर settings RPC केवल loopback हैं; दूरस्थ ब्राउज़र ब्राउज़र-स्थानीय `localStorage` पर fallback करते हैं।
- **पंक्ति बैज fallback** — जहाँ upstream का पंक्ति slot उपलब्ध नहीं है, session पंक्तियाँ शीर्षक पाठ से मेल खाती हैं; डुप्लिकेट शीर्षकों पर बैज हर मेल खाती पंक्ति पर दिखता है और पहले मेल को टॉगल करता है (कॉस्मेटिक)। हेडर टॉगल हमेशा id-आधारित होता है और अप्रभावित रहता है। slot वाली builds पर session पंक्तियाँ केवल slot से रेंडर होती हैं — fallback से डुप्लिकेट pin असंभव है।
- **Workspace पंक्ति मिलान** — workspace नियंत्रण नाम से मिलाए जाते हैं (host-द्वारा अद्वितीय); नाम बदलने पर अपने आप अनुसरण करता है। Ungrouped बाल्टी और खोज-परिणाम पंक्तियों पर जान-बूझकर नियंत्रण नहीं दिखते।
- **पंक्ति DOM निर्भरता** — ओवरले कोर पंक्तियों की `role="treeitem"` / `aria-selected` / `aria-expanded` संरचना पर निर्भर है और उसे upstream के UI बदलावों का अनुसरण करना होगा। पंक्ति रंगत के लिए CSS `:has()` चाहिए (Chrome 105+, Firefox 121+, Safari 15.4+); पुराने ब्राउज़र रंग-बिंदु तो देखते हैं, बस रंगत नहीं।

## 🌐 समुदाय

- [DeepSeek Harness Discord](https://discord.gg/Ycq5dCaS4) · [आधिकारिक चर्चाएँ](https://github.com/deepseek-ai/deepseek-harness/discussions)
- [`dsh-plugin` टॉपिक](https://github.com/topics/dsh-plugin) पर और plugin खोजें।

## 👥 योगदानकर्ता

इस plugin को आकार देने वाले सभी लोगों का धन्यवाद:

- [**PerryLink**](https://github.com/PerryLink) — निर्माता और अनुरक्षक: pin अनुभव, टिकाऊ स्थायित्व, workspace क्रम, प्रति-pin रंग, पाँच-भाषा दस्तावेज़ और सामुदायिक इंजीनियरिंग (v0.1.0 → v0.3.0)।

_योगदान का स्वागत है — शुरुआत के लिए एक [issue](https://github.com/PerryLink/dsh-session-pin/issues) खोलें या [discussion](https://github.com/PerryLink/dsh-session-pin/discussions) शुरू करें।_

## 📜 लाइसेंस

Apache License 2.0 — देखें [LICENSE](LICENSE)। Copyright © 2026 dsh-session-pin योगदानकर्ता।
