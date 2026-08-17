import type { Metadata } from "next";
import { DotsBackground } from "@/presentation/components/layout/DotsBackground";

export const metadata: Metadata = {
  title: "Terms of Service — SpikeClip",
  description: "SpikeClip Terms of Service",
};

export default function TermsPage() {
  return (
    <main className="relative container mx-auto px-4 sm:px-6 py-section max-w-3xl">
      <DotsBackground opacity={0.7} />
      <div className="relative z-10">
      <h1 className="text-3xl font-normal tracking-tight mb-6 text-center">Terms of Service</h1>
      <div className="prose prose-sm dark:prose-invert space-y-4">
        <p>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <h2 className="text-xl font-semibold mt-8">1. Acceptance of Terms</h2>
        <p>
          By accessing or using SpikeClip (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
          If you do not agree, do not use the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8">2. Description of Service</h2>
        <p>
          SpikeClip is a YouTube heatmap-driven clip extraction tool. It analyzes viewer engagement data
          to identify the most-replayed moments in videos and allows users to create short-form clips.
        </p>

        <h2 className="text-xl font-semibold mt-8">3. Account Registration</h2>
        <p>
          You must provide accurate and complete information when creating an account.
          You are responsible for maintaining the security of your account credentials.
        </p>

        <h2 className="text-xl font-semibold mt-8">4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6">
          <li>Use the Service for any unlawful purpose</li>
          <li>Attempt to circumvent usage limits or quotas</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Use the Service to infringe on intellectual property rights</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">5. Intellectual Property</h2>
        <p>
          The Service and its original content, features, and functionality are owned by SpikeClip
          and are protected by copyright, trademark, and other intellectual property laws.
        </p>

        <h2 className="text-xl font-semibold mt-8">6. Termination</h2>
        <p>
          We may terminate or suspend your account at any time for conduct that violates these Terms
          or is harmful to other users, third parties, or the business interests of SpikeClip.
        </p>

        <h2 className="text-xl font-semibold mt-8">7. Disclaimer</h2>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind.
          SpikeClip does not guarantee uninterrupted or error-free operation.
        </p>

        <h2 className="text-xl font-semibold mt-8">8. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time.
          Continued use of the Service after changes constitutes acceptance of the new Terms.
        </p>

        <h2 className="text-xl font-semibold mt-8">9. Contact</h2>
        <p>
          For questions about these Terms, please open an issue on our
          <a href="https://github.com/ahmedhat/SpikeClip" className="text-primary hover:underline"> GitHub repository</a>.
        </p>
      </div>
      </div>
    </main>
  );
}
