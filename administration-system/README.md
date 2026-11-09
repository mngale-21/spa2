# Administration System (Platform Super Admin Panel)

Hii ni programu ya pili, TOFAUTI na Salon Management System, inayotumiwa na
**mmiliki wa platform** kusimamia makampuni yote yanayotumia Salon
Management System, subscriptions zao, mapato, Sub-Admins, na mawasiliano na
wateja — kama ilivyoainishwa kwenye "Mahitaji ya Mfumo".

## USANIFU MUHIMU: DATABASE MOJA INAYOSHIRIKIWA

Programu hii **HAINA database yake yenyewe**. Inaelekeza kwenye **DATABASE
ILE ILE** inayotumiwa na Salon Management System backend (thamani ile ile
ya `DATABASE_URL` kwenye pande zote mbili). Hii ndiyo siri ya "Hitaji Kuu
Zaidi" la mfumo: Super Admin anapobonyeza "Create Company" hapa, safu mpya
za `Company` na `User` (Company Admin) zinaandikwa MOJA KWA MOJA kwenye
database moja ile ile ambayo Salon Management System inasoma — hakuna
network call, hakuna developer anayehitajika, hakuna deployment mpya.

```
              DATABASE MOJA: "salon_system"
        (companies, branches, users, sessions, ...)
                        ▲
          ┌─────────────┴─────────────┐
          │                           │
  Salon Management System     Administration System (hii)
  (mfumo wanaotumia wateja     (mfumo wa Super Admin/Sub-Admin
   - Company Admin/Cashier/     kusimamia makampuni yote)
   Staff wa kila kampuni)
```

`prisma/schema.prisma` ya programu hii ina **subset** tu ya majedwali
(Company, User) yaliyoainishwa kikamilifu kwenye schema ya Salon Management
System backend — angalia maelezo marefu juu ya faili hilo. **Salon
Management System backend ndiyo "chanzo cha ukweli" (source of truth) kwa
migrations** — programu hii KAMWE haiendeshi `prisma migrate`, ni
`prisma generate` tu.

## VIPENGELE VILIVYOPO (kulingana na Mahitaji ya Mfumo)

- **Kuongeza Kampuni Mpya (sehemu 4)**: Fomu moja — Super Admin anaingiza
  jina la kampuni, jina la mmiliki, email, simu, aina ya subscription, na
  tarehe za kuanza/kuisha. Kubonyeza "Sajili" kunafanya kila kitu:
  Company + Company Admin account + activation token + email (na WhatsApp
  ikiwa namba imetolewa) — moja kwa moja, bila kugusa database wala files.
- **Company Management (sehemu 12)**: VIEW, EDIT, SUSPEND, ACTIVATE,
  DELETE, ENTER SYSTEM — tabo za Active/Suspended/Deleted.
- **Subscription Management (sehemu 7)**: kuona tarehe za kuanza/kuisha,
  kampuni zinazokaribia kuisha (siku 7), zilizokwisha muda.
- **Revenue Management (sehemu 13)**: rekodi malipo ya kampuni + inaongeza
  muda wa subscription kiotomatiki — ukurasa wa "Mapato".
- **Super Admin vs Sub-Admin (sehemu 8-9)**: Super Admin anaona/anasimamia
  makampuni YOTE; Sub-Admin anaona tu makampuni aliyopewa.
- **Support Access / Enter System (sehemu 10)**: Super/Sub-Admin anaingia
  moja kwa moja kwenye mfumo wa kampuni fulani (bila password), na kila
  matumizi yanarekodiwa kwenye `ActivityLog` (nani, kampuni gani, saa ngapi).
- **Dashboard (sehemu 11)**: jumla ya makampuni, active/suspended/deleted,
  subscriptions (jumla/zilizoisha/zinazokaribia), mapato (jumla + chati ya
  kila mwezi), makampuni mapya mwezi huu, matukio ya hivi karibuni. Haiwezi
  "kuvunjika" (crash) hata database ikiwa tupu — kila kitu kina 0/empty-state.
- **Email + WhatsApp (sehemu 14)**: Email inafanya kazi moja kwa moja
  (SMTP). WhatsApp ni hiari (Twilio) — angalia sehemu ya WHATSAPP hapa chini.

## HATUA ZA KUANZISHA (SETUP)

Programu hii **haiwezi kusimama peke yake** — lazima iendeshwe pamoja na
Salon Management System backend, kwa sababu inashiriki database moja nayo.

1. Kwanza sanidi na endesha **Salon Management System backend** (angalia
   README yake) — HASA hatua ya `npx prisma migrate dev` (inatengeneza
   majedwali yote, ikiwemo `companies`, `platform_admins`, n.k.) na
   `npm run seed` (inatengeneza Super Admin wa kwanza + makampuni ya mfano).
2. Nakili `.env.example` kuwa `.env` hapa, na weka:
   - `DATABASE_URL` — **SAWA KABISA** na ile ya Salon backend.
   - `TENANT_SSO_SECRET` — **SAWA KABISA** na ile ya Salon backend.
   - `SALON_SYSTEM_URL` — anwani ya Salon Management System frontend (mf.
     `http://localhost:3000`) — kuna anwani MOJA TU kwa platform nzima.
   - Taarifa za SMTP (angalia sehemu ya EMAIL hapa chini).
3. `npm install`
4. `npm run prisma:generate` (kuunda Prisma Client — SIYO migrate).
5. `npm run dev`
6. Fungua http://localhost:3001 (au port unayotumia) na login kwa taarifa
   za Super Admin ulizotengeneza kwenye hatua ya 1 (`npm run seed` ya Salon
   backend inachapisha email/password kwenye console — default password:
   `54321`).

## BARUA PEPE (EMAIL) - INAFANYA KAZI MOJA KWA MOJA

Sawa na hapo awali: `lib/mailer.js` inatumia Nodemailer. Jaza `SMTP_HOST`,
`SMTP_USER`, `SMTP_PASS` kwenye `.env`. Ukitumia Gmail, tumia "App
Password" (Google Account → Security → App Passwords) badala ya password
ya kawaida.

## WHATSAPP - MAELEKEZO (HIARI)

Njia rahisi zaidi: **Twilio**.
1. Fungua akaunti www.twilio.com, wezesha "WhatsApp Sandbox".
2. Chukua `Account SID` na `Auth Token`, weka kwenye `.env`
   (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`).
3. `npm install twilio`

Njia rasmi zaidi (kwa uzalishaji halisi): **Meta WhatsApp Cloud API** —
fungua App kwenye developers.facebook.com, ongeza product "WhatsApp",
pata `Phone Number ID` na token, kisha badilisha `lib/whatsapp.js` itume
request ya HTTP moja kwa moja kwa `graph.facebook.com/v19.0/.../messages`
(mfano wa code upo kwenye README ya awali ya mradi huu, au niombe
nikuandikie).

## "ENTER SYSTEM" (SUPPORT ACCESS) INAVYOFANYA KAZI

1. Super/Sub-Admin anabofya "Ingia kwenye Mfumo Wake" kwenye orodha ya
   makampuni.
2. `POST /api/companies/:id/login-as` (hapa) inatengeneza JWT fupi (dakika
   5) iliyosainiwa na `TENANT_SSO_SECRET`, inarekodi tukio kwenye
   `ActivityLog`, na kurudisha URL:
   `${SALON_SYSTEM_URL}/sso/admin-login?token=...`
3. Browser inafunguliwa kwenye URL hiyo — Salon Management System frontend
   inaita `POST /api/platform/sso-login` kwenye backend yake, inathibitisha
   token, na kumfungulia Admin akiwa na ruhusa za Company Admin za kampuni
   hiyo, kwa muda wa saa 2.

## SUSPEND / ACTIVATE / DELETE — HAKUNA WEBHOOK TENA

Kwa sababu database ni moja, ku-suspend au ku-activate kampuni ni
`UPDATE companies SET status = ...` moja tu (kupitia Prisma) — Salon
Management System inaona mabadiliko HAPO HAPO kwenye request inayofuata ya
mtumiaji yeyote wa kampuni hiyo (angalia `authMiddleware.protect` upande
wa Salon backend). Hakuna API ya nje wala "webhook" inayohitajika.

## MUUNDO WA FAILI MUHIMU

```
salon-admin/
  prisma/schema.prisma        -> Company/User (subset ya Salon DB) + Subscription/Payment/PlatformAdmin/ActivityLog
  lib/auth.js                 -> Login/JWT/session (PlatformAdmin)
  lib/mailer.js                -> Kutuma EMAIL (activation, suspend, reactivate, expiry reminder)
  lib/whatsapp.js               -> Kutuma WHATSAPP (hiari - Twilio)
  lib/enterSystem.js            -> Inatengeneza "Enter System" URL/token
  app/api/companies/...        -> Create (automation kamili) / Edit / Suspend / Activate / Delete
  app/api/companies/[id]/login-as/route.js -> Enter System
  app/api/admins/...            -> Kuunda na kusimamia Sub-Admins
  app/api/payments/route.js     -> Revenue: rekodi malipo + renew subscription
  app/api/stats/route.js        -> Takwimu za dashboard
  app/dashboard/...              -> Kurasa zote za mfumo (UI)
```

## USALAMA - KABLA YA UZALISHAJI (PRODUCTION)

- Badilisha `JWT_SECRET` na `TENANT_SSO_SECRET` kuwa maneno marefu/nasibu.
- Badilisha password ya Super Admin wa default mara moja baada ya login.
- Wezesha HTTPS kwenye seva zote mbili.
- Hakikisha `schema.prisma` ya programu hii na ya Salon backend zinabaki
  SAWA kwa majedwali yanayoshirikiwa (`companies`, `users`) — badiliko
  lolote la muundo huko LAZIMA lioanishwe hapa pia.
