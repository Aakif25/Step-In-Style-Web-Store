# Step in Style — Supabase Connection Guide

This version is already coded for Supabase. You do **not** need to rewrite the website. You only need to create the Supabase project, run the included SQL, create your admin user, and paste your project URL + publishable key into `config.js`.

## What Supabase now stores

Supabase Database stores your products, categories, private A-to-Z supplier details, customer COD orders, order items, customers, reviews, expenses, offers, banners and store settings.

Supabase Authentication stores admin login securely and also supports optional customer email/Google accounts. **Customers can still checkout as guests. Login is NOT required to place an order.**

Supabase Storage stores product images/videos, description images/videos and customer review images/videos.

Only cart and wishlist remain in the visitor's browser, which is normal for ecommerce.

---

## Step 1 — Create Supabase project

1. Go to https://supabase.com and sign in.
2. Click **New project**.
3. Project name: `Step in Style`.
4. Create a strong database password and save it somewhere safe.
5. Select the nearest practical region for Sri Lanka.
6. Wait for the project to finish creating.

---

## Step 2 — Create the database, security rules and storage buckets

1. In the Supabase Dashboard open **SQL Editor**.
2. Click **New query**.
3. Open the included file `supabase-schema.sql` from this ZIP.
4. Copy the **entire file** into the SQL Editor.
5. Click **Run**.

The SQL creates:

- `products`
- `product_supplier_private`
- `categories`
- `orders`
- `order_items`
- `customers`
- `reviews`
- `expenses`
- `offers`
- `banners`
- `store_settings`
- `admin_users`
- secure guest-order RPC
- secure review RPC
- Row Level Security policies
- Storage buckets and upload policies

Storage buckets created:

- `product-images`
- `product-videos`
- `description-media`
- `review-media`

If you accidentally run the SQL again, the policies are dropped/recreated safely and existing data is not intentionally deleted.

---

## Step 3 — Create your real Admin account

The old `admin123` browser password has been removed completely.

1. Supabase Dashboard → **Authentication** → **Users**.
2. Click **Add user**. Depending on the Dashboard wording, create the user directly or send an invitation to your admin email.
3. Use the email/password you want for the Step in Style Admin Panel.
4. Make sure the user is confirmed and has a password.

Now register that Auth user as a Step in Style admin.

Open **SQL Editor** and run this separately, replacing the email:

```sql
insert into public.admin_users(user_id, name, role)
select id, 'Step in Style Admin', 'super_admin'
from auth.users
where email = 'YOUR-ADMIN-EMAIL@example.com'
on conflict (user_id) do update set role='super_admin';
```

Example only:

```sql
insert into public.admin_users(user_id, name, role)
select id, 'Step in Style Admin', 'super_admin'
from auth.users
where email = 'owner@example.com'
on conflict (user_id) do update set role='super_admin';
```

Do **not** put your password in SQL or in the website files.

---

## Step 4 — Get Project URL and Publishable Key

In Supabase open the project's **Connect** dialog or **Settings → API Keys**.

You need only:

1. **Project URL** — looks similar to `https://abcdefgh.supabase.co`
2. **Publishable key** — normally starts with `sb_publishable_...`

Older projects may also show a legacy `anon` key. The publishable key is preferred.

### Very important

Never place a **secret key**, **service_role key**, or `sb_secret_...` key in this website. This is browser code. The included RLS policies are designed for the publishable key.

---

## Step 5 — Edit `config.js`

Open:

`config.js`

You will see:

```js
window.STEP_IN_STYLE_CONFIG = {
  supabaseUrl: 'YOUR_SUPABASE_PROJECT_URL',
  supabasePublishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY'
};
```

Change it to your actual values:

```js
window.STEP_IN_STYLE_CONFIG = {
  supabaseUrl: 'https://abcdefgh.supabase.co',
  supabasePublishableKey: 'sb_publishable_xxxxxxxxxxxxxxxxx'
};
```

Save the file.

The publishable key can be visible in browser code. Security comes from the Row Level Security rules included in `supabase-schema.sql`.

---

## Step 6 — Configure Auth URLs before Google login / production

Guest checkout and Admin email/password login work without Google OAuth setup, but configure your production URL before launch.

Supabase Dashboard → **Authentication** → URL / Redirect settings:

- Set **Site URL** to your Vercel website, e.g. `https://step-in-style.vercel.app`
- Add your real Vercel/custom-domain URL to the allowed redirect URLs.
- For local testing, also allow `http://localhost:8000` if required by your Auth configuration.

### Optional Google customer login

Customer login is optional and is never required for checkout.

If you want the **Continue with Google** button to work:

1. Supabase → Authentication → Providers → Google.
2. Enable Google.
3. Create the Google OAuth credentials requested by Supabase.
4. Put the callback URL shown by Supabase into your Google OAuth configuration.
5. Keep your Vercel URL in Supabase's allowed redirect URLs.

If you do not configure Google yet, guest checkout and normal store operation still work.

---

## Step 7 — Test locally

Do not open `index.html` by double-clicking it. Use a local web server.

### Windows easiest method

Double-click:

`START_SERVER.bat`

Then open:

- Customer: `http://localhost:8000/`
- Admin: `http://localhost:8000/admin.html`

Login using the **Supabase admin email/password** you created.

---

## Step 8 — First full test

Do this before Vercel deployment:

1. Admin → Products → Manage Categories → create one category.
2. Admin → Add Product.
3. Enter title.
4. Upload 1–5 product images.
5. Add product video / YouTube URL if needed.
6. Enter selling price.
7. Build description with text, images, videos, features and specifications.
8. Add the private A-to-Z product code, URL, supplier cost, shipping and ad cost.
9. Publish.
10. Open the customer home page in another browser/incognito window.
11. Confirm the product appears.
12. Open the dedicated product page.
13. Place a test Cash on Delivery order as a **guest**.
14. Go back to Admin → Orders and refresh/change page.
15. Confirm the order appears.
16. Use **Copy A to Z Order Details**.
17. Change status / enter A-to-Z order number.
18. Mark profit received when testing.
19. Submit a customer review with a photo/video.
20. Admin → Reviews → approve it.
21. Confirm the review appears on the product page.

This proves Database + Authentication + Storage are all connected.

---

## Step 9 — Deploy to Vercel

After Supabase works locally:

1. Zip the website folder again if you changed `config.js` after extracting it.
2. Upload/deploy the folder or ZIP to Vercel.
3. Vercel Framework Preset: **Other**.
4. No build command is required.
5. The root directory must contain `index.html`.
6. Open the deployed Admin page: `/admin.html`.
7. Test one product and one test order again from a different device.

Because the data now lives in Supabase, a product added from your laptop is visible to customers on their phones, and orders placed on customer phones appear in your Admin Panel.

---

## Security model included in this build

### Public/customer visitors can

- read published products
- read categories
- read approved reviews
- read active offers/banners
- place a guest COD order through a secure database function
- submit a review for Admin approval
- upload review media into the review submission area

### Public/customer visitors cannot

- read private A-to-Z supplier costs or URLs
- read all customer orders
- read customer database records
- change order statuses
- approve reviews
- edit products
- read finance/expense data
- access Admin functions

### Admin can

- manage products
- manage private A-to-Z data
- upload product/description media
- view/manage orders
- approve/reject/reply to reviews
- manage expenses, offers, banners and settings
- view customer and profit information

---

## Media limits in this build

- Product images: up to 8 MB source each; browser compresses them before upload.
- Product videos: up to 50 MB.
- Description video: up to 50 MB.
- Review image: up to 8 MB source; browser compresses it.
- Review video: up to 25 MB.

Supabase Free projects currently have a global maximum upload limit, so keep the project's Storage global file-size setting at least as high as the largest file you want to accept.

---

## Important production notes

- `config.js` must use the **publishable key**, never the secret/service-role key.
- Keep Row Level Security enabled.
- Customer checkout does **not** require login.
- The website calculates displayed totals, but the secure `place_order` database function recalculates prices from Supabase so a customer cannot change the price using browser developer tools.
- Private A-to-Z supplier information is in a separate RLS-protected table.
- Admin password is no longer stored in JavaScript or localStorage.
- Supabase Auth itself persists signed-in sessions securely in the browser using its standard client session handling.

