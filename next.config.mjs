/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.clerk.dev'],
  },
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_ZGVjaWRpbmctZWFyd2lnLTI1LmNsZXJrLmFjY291bnRzLmRldiQ',
    CLERK_SECRET_KEY: 'sk_test_i9fzVoV8TY8UvIAb3MwF3BoMY73APhfNJs7hOuNl48',
    NEXT_PUBLIC_STREAM_API_KEY: 'pmx7dhj5kn7j',
    STREAM_SECRET_KEY: '3jj98de3nez3v48zyaub4rzv72wgrhrfz2tabzbn29ntkkf628dxwttdgqphb3cg',
    NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
    MONGODB_URI: 'mongodb://localhost:27017/wismeet',
  },
};

export default nextConfig;
