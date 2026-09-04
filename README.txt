STEP IN STYLE — SUPABASE PRODUCTION BUILD
=========================================

Business: Step in Style
Phone: 0719141519
WhatsApp: 0719141519

THIS BUILD USES REAL CLOUD DATA
-------------------------------
The previous browser-only localStorage business database has been replaced.

Supabase Database:
- Products
- Categories
- Private A to Z supplier data
- Orders + order items
- Customers
- Reviews
- Expenses
- Offers
- Banners
- Settings

Supabase Authentication:
- Secure Admin email/password login
- Optional customer email account
- Optional Google customer login after provider setup
- Customer login is NOT required to checkout

Supabase Storage:
- Product images
- Product videos
- Product description media
- Customer review images/videos

Only cart and wishlist stay in the customer's local browser.

FIRST THING TO DO
-----------------
Read: SUPABASE_SETUP.md

Then:
1. Create Supabase project.
2. Run supabase-schema.sql in Supabase SQL Editor.
3. Create your Admin Auth user.
4. Add that user to public.admin_users using the SQL shown in SUPABASE_SETUP.md.
5. Copy Project URL + Publishable Key into config.js.
6. Test locally with START_SERVER.bat.
7. Deploy to Vercel.

IMPORTANT SECURITY
------------------
NEVER place a Supabase service_role / secret key in config.js.
Use only the Project URL + Publishable key.
RLS policies are already included in supabase-schema.sql.

CUSTOMER EXPERIENCE
-------------------
- Mobile-first design
- Guest Cash on Delivery checkout
- No forced login
- Dedicated product page, not popup product card
- Product image/video gallery
- Rich Admin-created descriptions
- Customer reviews with photos/video
- Wishlist + cart
- WhatsApp 0719141519
- No customer order tracking feature

ADMIN PRODUCT EDITOR
--------------------
- Easy title/basic details first
- 1–5 product images
- Main image/reorder/delete
- Product video uploads + YouTube/direct links
- Selling price + old price + automatic discount
- Description builder: Heading, Text, Image, Video, Features, Specifications
- Private A to Z code/URL/cost/shipping/other/ad cost
- Automatic gross/net profit
- Availability, variants, badges, featured/new flags
- SEO
- Draft / Preview / Publish

A TO Z ORDER WORKFLOW
---------------------
Customer order -> New Order -> Customer Confirmed -> Copy customer details -> Open A to Z product -> Enter A to Z Order ID -> Submitted -> Processing -> Shipped -> Delivered -> Profit Received.

FILES
-----
index.html              Customer store
product.html            Dedicated customer product page
admin.html              Admin panel
styles.css              Mobile + desktop design
config.js               Paste Supabase URL + Publishable Key here
data.js                 Supabase database/auth/storage integration
app.js                  Customer/cart/checkout/auth logic
product.js              Product page + review upload logic
admin.js                Admin business logic
supabase-schema.sql      Full DB/RLS/RPC/Storage setup
SUPABASE_SETUP.md        Exact connection instructions
START_SERVER.bat         Local Windows test server
