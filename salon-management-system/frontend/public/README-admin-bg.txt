Admin dashboard background image
=================================

Drop an image file named exactly:

    admin-bg.jpg

into this folder (frontend/public/) and the Admin console (every
/dashboard/admin/* page) will automatically use it as a subtle full-page
background, with a soft cream wash on top so text and cards stay fully
readable — no code changes needed.

Recommended: a wide, low-contrast photo (salon interior, texture, etc.),
at least 1920px wide, since it's shown with backgroundSize: cover across
the whole content area.

If no admin-bg.jpg is present, the console still looks intentional — it
just shows the plain cream background as before.

This file is just a note for whoever manages the deployment; it isn't
read by the app and is safe to delete once admin-bg.jpg is in place.
