
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MatiLogo from '@/components/core/mati-logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-muted min-h-screen py-8 sm:py-16 px-4">
        <div className="container max-w-4xl mx-auto">
             <div className="mb-8 text-center">
                <MatiLogo iconSize={32} textSize="text-3xl" />
            </div>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">Privacy Policy</CardTitle>
                    <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        <strong>This is a placeholder for your Privacy Policy.</strong> It's essential to replace this with your own policy, drafted or reviewed by a legal professional.
                    </p>
                    
                    <h2>1. Information We Collect</h2>
                    <p>
                        We collect information you provide directly to us, such as when you create an account, and information we get when you use our services. This includes:
                    </p>
                    <ul>
                        <li><strong>Account Information:</strong> Your name, email address, and password (hashed).</li>
                        <li><strong>Content:</strong> Links, notes, images, voice recordings, and any other content you save to Mati.</li>
                        <li><strong>Usage Information:</strong> We collect information about how you use the services, such as the types of content you view or engage with, the features you use, and the time, frequency, and duration of your activities.</li>
                    </ul>

                    <h2>2. How We Use Information</h2>
                    <p>We use the information we collect to:</p>
                    <ul>
                        <li>Provide, maintain, and improve our services.</li>
                        <li>Analyze content using third-party AI services (e.g., Google AI) to provide features like automatic tagging and content enrichment. By using these features, you agree that your content may be sent to these services.</li>
                        <li>Communicate with you, including to respond to your comments, questions, and requests; provide customer service; and send you technical notices, updates, security alerts, and administrative messages.</li>
                    </ul>

                     <h2>3. How We Share Information</h2>
                    <p>We do not share your personal information with companies, organizations, or individuals outside of Mati except in the following cases:</p>
                    <ul>
                        <li><strong>With your consent.</strong></li>
                        <li><strong>For external processing:</strong> We provide personal information to our affiliates or other trusted businesses or persons to process it for us, based on our instructions and in compliance with our Privacy Policy and any other appropriate confidentiality and security measures. This includes AI service providers like Google AI for content analysis.</li>
                        <li><strong>For legal reasons:</strong> We will share personal information if we have a good-faith belief that access, use, preservation or disclosure of the information is reasonably necessary.</li>
                    </ul>

                    <h2>4. Your Choices & Rights</h2>
                    <p>You have rights over your personal data. You may review, update, or delete your information by signing into your account. If you have any questions about our privacy practices, please contact us at [Your Contact Email].</p>
                
                    <div className="mt-8 p-4 bg-yellow-100/50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-md">
                        <p className="font-bold">Disclaimer:</p>
                        <p>This is a template and not a complete Privacy Policy. You must consult with a legal professional to ensure your policy complies with all applicable laws and regulations for your jurisdiction and use case.</p>
                    </div>

                </CardContent>
            </Card>
            <div className="mt-8 text-center">
                 <Button asChild variant="outline">
                    <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to App</Link>
                </Button>
            </div>
        </div>
    </div>
  );
}
