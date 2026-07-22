import type { Metadata } from "next";
import { DotsBackground } from "@/presentation/components/layout/DotsBackground";

export const metadata: Metadata = {
  title: "Privacy Policy — SpikeClip",
  description: "SpikeClip Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main className="relative container mx-auto px-4 py-12 max-w-3xl">
      <DotsBackground opacity={0.2} />
      <div className="relative z-10">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose prose-sm dark:prose-invert space-y-4">
        <p>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <h2 className="text-xl font-semibold mt-8">1. Information We Collect</h2>
        <p>We collect the following information when you use SpikeClip:</p>
        <ul className="list-disc pl-6">
          <li><strong>Account information:</strong> Email address and display name</li>
          <li><strong>Usage data:</strong> YouTube URLs analyzed, clips created, and usage quotas</li>
          <li><strong>Payment information:</strong> Processed by Stripe (we do not store card details)</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul className="list-disc pl-6">
          <li>Provide and maintain the Service</li>
          <li>Process your video analyses and clip exports</li>
          <li>Manage your account and subscription</li>
          <li>Communicate with you about the Service</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">3. Data Storage</h2>
        <p>
          Your data is stored securely on our infrastructure. Video analyses and clips are stored
          temporarily and may be deleted after a period of inactivity.
        </p>

        <h2 className="text-xl font-semibold mt-8">4. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul className="list-disc pl-6">
          <li><strong>YouTube (yt-dlp):</strong> To fetch video metadata and heatmap data</li>
          <li><strong>Stripe:</strong> To process payments for premium plans</li>
          <li><strong>Google/GitHub OAuth:</strong> For optional social login</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">5. Data Retention</h2>
        <p>
          We retain your account information for as long as your account is active.
          Video analysis data and clips may be automatically deleted after 30 days of inactivity.
        </p>

        <h2 className="text-xl font-semibold mt-8">6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="list-disc pl-6">
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Delete your account and associated data</li>
          <li>Export your data</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">7. Contact</h2>
        <p>
          For privacy-related inquiries, please open an issue on our
          <a href="https://github.com/ahmedhat/SpikeClip" className="text-primary hover:underline"> GitHub repository</a>.
        </p>
      </div>
      </div>
    </main>
  );
}
