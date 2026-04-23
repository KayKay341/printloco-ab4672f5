import { Helmet } from "react-helmet-async";

const SITE_URL = "https://printloco.shop";
const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/3bf97bee-61c1-42f4-b1eb-38cf772075c8";

export type SEOProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  /** Optional JSON-LD structured data object(s) */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

/**
 * Per-page SEO meta tags. Wrap App with HelmetProvider once at root.
 * Title kept under ~60 chars, description under ~160 chars by callers.
 */
export default function SEO({
  title,
  description,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  noindex = false,
  jsonLd,
}: SEOProps) {
  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const jsonLdArray = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow,max-image-preview:large" />
      )}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="PrintLoco" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {jsonLdArray.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}
