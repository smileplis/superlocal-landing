# Cloudinary setup

Public images (shop photos, product photos, rental item photos, menu cards) are uploaded directly from the browser to Cloudinary, not to Supabase Storage. This dramatically reduces Supabase egress (our #1 free-tier bottleneck) and gives us automatic WebP/AVIF + responsive resizing for free.

Private docs (rental ID proofs, damage photos, future prescription pads) still go to Supabase Storage so RLS controls access.

## One-time setup

### 1. Create a Cloudinary account
Sign up at https://cloudinary.com — free tier is generous (25 GB storage + 25 GB egress/month + 25K transformations/month).

### 2. Note your cloud name
Dashboard → top of the page shows **Cloud name** (looks like `abc123xyz`).

### 3. Create an **unsigned** upload preset
- Settings (gear icon) → **Upload** → scroll to **Upload presets** → **Add upload preset**.
- **Preset name**: anything (e.g. `superlocal_unsigned`)
- **Signing Mode**: **Unsigned** *(critical — this lets the browser upload directly without our server)*
- **Folder**: leave blank (we set folders per upload in code: `superlocal/shops/...`, `superlocal/products`, etc.)
- **Use filename**: off (Cloudinary will assign IDs)
- **Unique filename**: on
- Optional sensible guards:
  - **Allowed formats**: `jpg,jpeg,png,webp,gif,pdf`
  - **Max image file size**: `8388608` (8 MB)
  - **Auto image moderation**: off (paid feature)
  - **Format**: `auto`
  - **Quality**: `auto:good`
- **Save**.
- Note the preset name.

### 4. Add env vars to Vercel
**Settings → Environment Variables**, add both for Production + Preview + Development:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Your cloud name (e.g. `abc123xyz`) |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Your preset name (e.g. `superlocal_unsigned`) |

Then **Deployments → … → Redeploy** so the new envs apply.

### 5. Test
- Open `/shop` on a logged-in provider → scroll to "Photos / Menu / Files" → upload an image.
- You should see it appear immediately with the Cloudinary URL (looks like `https://res.cloudinary.com/<cloud>/image/upload/v.../superlocal/shops/<provider-id>/abc123.jpg`).
- Open Cloudinary dashboard → **Media Library** → verify it's there in the `superlocal/shops/<provider-id>/` folder.

## What's wired in

Every image-upload surface uses the shared `<CloudinaryUploader>` component. It supports:
- Single-image mode (product photo, rental item photo)
- Multi-image mode (shop assets, PG photos in future)
- Per-upload folder + tags
- File size cap (default 8 MB)
- Live preview with remove-icon

Every image-display surface uses the shared `<CloudinaryImage>` component. It:
- Auto-injects `f_auto,q_auto,w_<intrinsic>,dpr_auto` transforms
- Falls through unchanged for legacy Supabase Storage URLs (existing uploads keep working)
- Lazy-loads by default

## Folders used

| Path | What |
|---|---|
| `superlocal/shops/<provider-uuid>` | Shop assets (photos, menu PDFs) |
| `superlocal/products` | Retail product photos |
| `superlocal/rental-items` | Rental item photos |

## Migration

Existing Supabase Storage uploads still work. `<CloudinaryImage>` passes them through unchanged. There's no need to migrate old files — they'll naturally roll over as providers re-upload.

If you want to actively migrate, an admin job would:
1. Iterate `profiles.shop_assets` where `url` contains `supabase.co/storage/`
2. Download from Supabase → upload to Cloudinary → swap URL on the row
3. Delete the Supabase Storage object

Phase 2 work — not blocking.

## Cost ceiling

Free tier: 25 GB storage, 25 GB egress/month, 25K transformations/month.

Realistic limits before paid:
- ~5,000 product photos at 200 KB each = 1 GB storage. Fine for years.
- 25 GB egress / 30 KB per image (post-optimisation) = ~830,000 image views/month. Comfortable for thousands of active shops.

First paid tier ("Plus"): $99/mo gets 225 GB storage + 225 GB egress + 225K transformations. Only needed when we're well past PMF.

## Troubleshooting

**"Image hosting isn't configured" banner appears on the shop page.**
Env vars aren't set on this deploy. Re-check Vercel env config + redeploy.

**Upload returns "Upload preset must be whitelisted for unsigned uploads".**
The preset is signed, not unsigned. Edit it in Cloudinary settings → set Signing Mode to **Unsigned**.

**Upload returns "Invalid Signature".**
You set the preset's signing mode to **Signed**. Must be **Unsigned** for browser uploads.

**Old images still serve from Supabase.**
Expected. Only new uploads go to Cloudinary. `<CloudinaryImage>` handles both gracefully.
