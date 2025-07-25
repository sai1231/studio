
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MatiLogo from '@/components/core/mati-logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="bg-muted min-h-screen py-8 sm:py-16 px-4">
        <div className="container max-w-4xl mx-auto">
             <div className="mb-8 text-center">
                <MatiLogo iconSize={32} textSize="text-3xl" />
            </div>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">Terms of Service</CardTitle>
                    <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <p>
                        <strong>This is a placeholder for your Terms of Service.</strong> Please replace this text with your own official terms, drafted or reviewed by a legal professional.
                    </p>

                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By creating an account and using the Mati application ("Service"), you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the Service.
                    </p>

                    <h2>2. User-Generated Content</h2>
                    <p>
                        You are solely responsible for the content you save, upload, or link to ("Content") using the Service. You retain all ownership rights to your Content. However, by using the Service, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, process, and display your Content solely for the purpose of operating, providing, and improving the Service (e.g., creating backups, generating AI-powered analysis for you).
                    </p>
                    <p>
                        You agree not to use the Service to save any Content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable. We reserve the right, but not the obligation, to remove or refuse to display any Content that we believe violates these terms.
                    </p>

                    <h2>3. Service Availability</h2>
                    <p>
                        We strive to keep the Service available, but it may be interrupted for maintenance, upgrades, or network failures. We will not be liable for any loss or damage caused by a modification, suspension, or discontinuance of the Service.
                    </p>

                    <h2>4. Termination</h2>
                    <p>
                        We may terminate or suspend your account at any time, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
                    </p>

                    <h2>5. Limitation of Liability</h2>
                    <p>
                        The Service is provided on an "AS IS" and "AS AVAILABLE" basis. To the maximum extent permitted by applicable law, in no event shall Mati or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever arising out of or in any way related to the use of or inability to use the Service.
                    </p>
                    
                     <div className="mt-8 p-4 bg-yellow-100/50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-md">
                        <p className="font-bold">Disclaimer:</p>
                        <p>This is a template and not a complete Terms of Service document. It is crucial to consult with a legal professional to customize these terms for your specific application and legal requirements.</p>
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
