import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import {
  Shield,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  EyeOff,
  Copyright,
  Info,
  Repeat,
  Award,
  Gavel,
  Lock,
  UserX,
  Scale,
  Mail,
  HelpCircle,
  Ban,
} from 'lucide-react';
import { getBrandGradient } from '@/lib/brand';

const sections = [
  {
    icon: Users,
    title: '1. Eligibility & User Requirements',
    content: [
      '<strong>Age Requirement:</strong> You must be at least 18 years of age to create an account and use Quiz Dangal. By registering, you confirm that you meet this age requirement.',
      '<strong>Accurate Information:</strong> You must provide accurate, current, and complete information during registration. Providing false information may result in account suspension.',
      '<strong>One Account Per User:</strong> Each user is permitted only one account. Creating multiple accounts, fake accounts, or duplicate registrations is strictly prohibited and will result in immediate ban.',
      '<strong>Geographic Eligibility:</strong> Quiz Dangal is available to users in India. By using the platform, you confirm that you are accessing it from a permitted location.',
      '<strong>Legal Capacity:</strong> You must have the legal capacity to enter into binding agreements. If you are registering on behalf of an organization, you represent that you have authority to bind that organization.',
    ],
  },
  {
    icon: Shield,
    title: '2. Account Registration & Security',
    content: [
      '<strong>Unique Credentials:</strong> Register with a unique username and email address. Your username will be visible to other users on leaderboards and during quizzes.',
      '<strong>Password Security:</strong> Choose a strong password and keep it confidential. We recommend using a combination of uppercase, lowercase, numbers, and special characters.',
      '<strong>Account Responsibility:</strong> You are responsible for all activities that occur under your account. Never share your login credentials with anyone.',
      '<strong>Unauthorized Access:</strong> If you suspect unauthorized access to your account, contact us immediately at support@quizdangal.com. We are not liable for losses due to compromised credentials.',
      '<strong>Account Verification:</strong> We may require email or phone verification to ensure account security. Failure to complete verification may limit access to certain features.',
    ],
  },
  {
    icon: FileText,
    title: '3. Quiz Gameplay Rules',
    content: [
      '<strong>Skill-Based Competition:</strong> Quiz Dangal is a game of skill. Winners are determined solely based on knowledge, accuracy of answers, and speed of response—not chance or luck.',
      '<strong>Quiz Timing:</strong> Each quiz has a fixed start time and end time. You must join before the quiz starts and submit your answers before the deadline. Late submissions are automatically invalidated.',
      '<strong>Answer Submission:</strong> Once you submit an answer, it cannot be changed. Review your answers carefully before submitting. All answer selections are final.',
      '<strong>Results Declaration:</strong> Quiz results are calculated after the quiz ends and are final. We use automated systems to ensure fair and accurate scoring.',
      '<strong>No Appeals on Results:</strong> Once results are declared, they cannot be appealed or changed unless a technical error is identified by our team.',
      '<strong>Quiz Modifications:</strong> We reserve the right to modify, postpone, or cancel any quiz due to technical issues, unforeseen circumstances, or policy violations detected during the quiz.',
    ],
  },
  {
    icon: CreditCard,
    title: '4. Rewards, Coins & Wallet System',
    content: [
      '<strong>Free Participation:</strong> All quizzes on Quiz Dangal are currently free to enter. There are no entry fees or pay-to-play requirements.',
      '<strong>Earning Coins:</strong> You can earn coins by answering quiz questions correctly, maintaining daily streaks, referring friends, and participating in special events.',
      '<strong>Coin Value:</strong> Coins are virtual rewards for in-app use only. They have no monetary value outside Quiz Dangal and cannot be exchanged for cash or transferred to other users.',
      '<strong>Reward Redemption:</strong> Accumulated coins can be redeemed for rewards as listed in our redemption section. Reward availability may change without prior notice.',
      '<strong>Non-Refundable:</strong> Coins and rewards once credited to your account are non-refundable. No exceptions apply.',
      '<strong>Expiration:</strong> Coins may expire if your account remains inactive for an extended period. We will notify you before any expiration occurs.',
      '<strong>Forfeiture:</strong> Coins earned through violations of terms (fake accounts, cheating, etc.) will be forfeited immediately upon detection.',
    ],
  },
  {
    icon: Award,
    title: '5. Referral & Earn Program',
    content: [
      '<strong>Referral Eligibility:</strong> Registered users can invite friends to join Quiz Dangal using their unique referral code or link.',
      '<strong>Referral Rewards:</strong> When a new user signs up using your referral code and meets the qualification criteria, both you and the new user may receive bonus coins.',
      '<strong>Qualification Criteria:</strong> Referred users must complete registration, verify their account, and participate in at least one quiz to be considered a valid referral.',
      '<strong>Misuse Prevention:</strong> Self-referrals, fake accounts for referral farming, or any form of abuse of the referral program is strictly prohibited.',
      '<strong>Consequences of Abuse:</strong> Detected misuse of the referral program will result in forfeiture of all referral rewards, account suspension, or permanent ban.',
      '<strong>Program Changes:</strong> We reserve the right to modify, suspend, or terminate the referral program at any time without prior notice.',
    ],
  },
  {
    icon: AlertTriangle,
    title: '6. Responsible Usage',
    content: [
      '<strong>Entertainment Purpose:</strong> Quiz Dangal is designed for entertainment and learning. It should be enjoyed responsibly as a fun activity.',
      '<strong>Not Gambling:</strong> Quiz Dangal is NOT a gambling platform. There is no element of chance—all outcomes are based purely on skill and knowledge.',
      '<strong>Time Management:</strong> We encourage users to manage their time responsibly. Quiz Dangal should not interfere with work, studies, or personal responsibilities.',
      '<strong>Mental Health:</strong> If you feel that playing quizzes is negatively affecting your mental health or daily life, we encourage you to take a break.',
      '<strong>Support Resources:</strong> If you need help managing your usage, please reach out to our support team for guidance.',
    ],
  },
  {
    icon: EyeOff,
    title: '7. Fair Play & Anti-Cheating Policy',
    content: [
      '<strong>Zero Tolerance:</strong> Quiz Dangal has a zero-tolerance policy for cheating, hacking, or any form of unfair advantage.',
      '<strong>Prohibited Activities:</strong> Using bots, automated scripts, browser extensions, or any tools to manipulate quiz results is strictly prohibited.',
      '<strong>Collusion:</strong> Sharing answers with other users during live quizzes or collaborating to gain unfair advantage is prohibited.',
      '<strong>Multiple Device Abuse:</strong> Playing the same quiz from multiple devices or accounts simultaneously is not allowed.',
      '<strong>Detection Systems:</strong> We employ advanced detection systems to identify suspicious activity. Flagged accounts will be investigated.',
      '<strong>Consequences:</strong> Violations may result in immediate disqualification from quizzes, forfeiture of coins and rewards, temporary suspension, or permanent account ban.',
      '<strong>No Compensation:</strong> Users banned for fair play violations are not entitled to any compensation for lost coins, rewards, or account data.',
    ],
  },
  {
    icon: Copyright,
    title: '8. Intellectual Property Rights',
    content: [
      '<strong>Ownership:</strong> All content on Quiz Dangal—including quiz questions, graphics, logos, design elements, and software—is the intellectual property of Quiz Dangal or its licensors.',
      '<strong>Limited License:</strong> You are granted a limited, non-exclusive, non-transferable license to use Quiz Dangal for personal, non-commercial purposes only.',
      '<strong>Restrictions:</strong> You may not copy, reproduce, modify, distribute, or create derivative works from Quiz Dangal content without prior written permission.',
      '<strong>User Content:</strong> By submitting any content (feedback, suggestions) to Quiz Dangal, you grant us a perpetual, royalty-free license to use such content.',
      '<strong>Trademarks:</strong> Quiz Dangal and associated logos are trademarks. Use of our trademarks without permission is prohibited.',
    ],
  },
  {
    icon: Info,
    title: '9. Disclaimer & Limitation of Liability',
    content: [
      '<strong>As-Is Service:</strong> Quiz Dangal is provided on an "as is" and "as available" basis without warranties of any kind, express or implied.',
      '<strong>No Guarantee:</strong> We do not guarantee that the service will be uninterrupted, secure, error-free, or free from viruses or other harmful components.',
      '<strong>Technical Issues:</strong> We are not liable for any technical failures, server downtime, connectivity issues, or data loss that may affect your quiz experience.',
      '<strong>Indirect Damages:</strong> In no event shall Quiz Dangal be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform.',
      '<strong>Maximum Liability:</strong> Our total liability for any claims arising from your use of Quiz Dangal shall not exceed the amount of coins you have in your account.',
      '<strong>User Responsibility:</strong> You access and use Quiz Dangal at your own risk. We recommend keeping your device and software up-to-date for the best experience.',
    ],
  },
  {
    icon: Repeat,
    title: '10. Modifications & Updates',
    content: [
      '<strong>Terms Updates:</strong> We reserve the right to modify these Terms & Conditions at any time. Changes will be posted on this page with an updated "Last Updated" date.',
      '<strong>Feature Changes:</strong> Quiz Dangal may add, modify, or remove features, quizzes, or rewards at any time without prior notice.',
      '<strong>Notification:</strong> For significant changes to these terms, we will attempt to notify users through the app or email. However, it is your responsibility to review these terms periodically.',
      '<strong>Acceptance:</strong> Your continued use of Quiz Dangal after any changes constitutes your acceptance of the modified terms.',
    ],
  },
  {
    icon: Scale,
    title: '11. Legal Compliance & Game of Skill',
    content: [
      '<strong>Skill-Based Platform:</strong> Quiz Dangal is legally classified as a game of skill. Winners are determined by knowledge, accuracy, and speed—not by chance or luck.',
      '<strong>Not Gambling:</strong> Quiz Dangal is explicitly NOT a gambling, betting, or wagering platform. No element of chance determines outcomes.',
      '<strong>Indian Law Compliance:</strong> Quiz Dangal operates in compliance with applicable laws and regulations in India, including the Public Gambling Act (1867) exemptions for games of skill.',
      '<strong>Age Verification:</strong> Users must be 18 years or older to participate in reward-based activities on Quiz Dangal.',
      '<strong>Jurisdiction:</strong> These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Jaipur, Rajasthan.',
    ],
  },
  {
    icon: CreditCard,
    title: '12. Refund & Cancellation Policy',
    content: [
      '<strong>Free Service:</strong> All quiz entries on Quiz Dangal are currently free of charge. There are no payments required to participate.',
      '<strong>No Refunds on Free Services:</strong> Since all services are free, there are no refunds applicable.',
      '<strong>Coins & Rewards:</strong> Coins and rewards credited to your account are non-refundable under any circumstances, including account suspension or closure.',
      '<strong>Future Paid Features:</strong> If paid features are introduced in the future, a detailed refund policy specific to those features will be published.',
      '<strong>Disputes:</strong> For any billing or reward-related disputes, contact support@quizdangal.com within 7 days of the transaction.',
    ],
  },
  {
    icon: UserX,
    title: '13. Account Suspension & Termination',
    content: [
      '<strong>Violation of Terms:</strong> We reserve the right to suspend or terminate accounts that violate these Terms & Conditions.',
      '<strong>Immediate Suspension:</strong> Accounts engaged in cheating, fraud, abuse, or illegal activities may be suspended immediately without prior warning.',
      '<strong>Investigation:</strong> Suspended accounts may be investigated. If violations are confirmed, suspension will become permanent.',
      '<strong>Data Handling:</strong> Upon account termination, your personal data will be handled according to our Privacy Policy. Some data may be retained for legal purposes.',
      '<strong>No Compensation:</strong> Terminated accounts are not entitled to any compensation for lost coins, rewards, or account data.',
      '<strong>Reinstatement:</strong> In exceptional cases, terminated accounts may be reinstated after review. Contact support@quizdangal.com to request a review.',
    ],
  },
  {
    icon: Lock,
    title: '14. Privacy & Data Protection',
    content: [
      '<strong>Privacy Policy:</strong> Your privacy is important to us. Our collection, use, and protection of personal data is governed by our Privacy Policy.',
      '<strong>Data Security:</strong> We implement industry-standard security measures to protect your data. See our Privacy Policy for details.',
      '<strong>Third-Party Sharing:</strong> We do not sell your personal data. Limited sharing occurs only with service providers necessary for platform operation.',
      '<strong>Your Rights:</strong> You have rights to access, correct, and delete your personal data as described in our Privacy Policy.',
    ],
  },
  {
    icon: Gavel,
    title: '15. Dispute Resolution',
    content: [
      '<strong>Contact First:</strong> For any disputes or concerns, first contact our support team at support@quizdangal.com. We aim to resolve issues amicably.',
      '<strong>Mediation:</strong> If a dispute cannot be resolved through support, both parties agree to attempt mediation before pursuing legal action.',
      '<strong>Arbitration:</strong> Disputes that cannot be resolved through mediation shall be settled by binding arbitration in Jaipur, Rajasthan, India.',
      '<strong>Class Action Waiver:</strong> You agree to resolve disputes on an individual basis and waive any right to participate in class action lawsuits.',
      '<strong>Governing Law:</strong> These Terms are governed by the laws of India. The courts of Jaipur, Rajasthan shall have exclusive jurisdiction.',
    ],
  },
];

const highlights = [
  { icon: CheckCircle, title: 'Skill-Based Competition', description: 'Win purely by knowledge, accuracy, and speed' },
  { icon: Shield, title: 'Secure & Fair', description: 'Protected data with anti-cheat systems' },
  { icon: CreditCard, title: 'Free to Play', description: 'No entry fees or hidden charges' },
  { icon: Award, title: 'Real Rewards', description: 'Earn coins and redeem for prizes' },
];

const TermsConditions = () => {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'Is Quiz Dangal free to use?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, Quiz Dangal is completely free to play. There are no entry fees or hidden charges.' } },
      { '@type': 'Question', name: 'Is Quiz Dangal a gambling platform?', acceptedAnswer: { '@type': 'Answer', text: 'No, Quiz Dangal is a game of skill, not gambling. Winners are determined by knowledge and speed, not chance.' } },
      { '@type': 'Question', name: 'What happens if I violate the terms?', acceptedAnswer: { '@type': 'Answer', text: 'Violations may result in disqualification, forfeiture of rewards, account suspension, or permanent ban depending on severity.' } },
    ],
  };

  return (
    <div className="min-h-screen pt-14 text-slate-100">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        <SEO
          title="Terms & Conditions – Quiz Dangal | Rules, Policies & Guidelines"
          description="Complete Terms & Conditions for Quiz Dangal. Learn about eligibility, gameplay rules, fair play policies, rewards system, and user guidelines. Read before playing."
          canonical="https://quizdangal.com/terms-conditions/"
          alternateLocales={['hi_IN', 'en_US']}
          keywords={[
            'quiz dangal terms',
            'quiz dangal terms and conditions',
            'quiz app terms and conditions',
            'quiz dangal rules',
            'quiz dangal policies',
            'quiz dangal user agreement',
            'quiz dangal guidelines',
          ]}
          jsonLd={[faqSchema]}
        />

        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent mb-3">
            Terms & Conditions
          </h1>
          <div className="flex items-center justify-center space-x-2 text-slate-300 mb-4">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Last Updated: December 29, 2025</span>
          </div>
          <p className="text-base text-slate-300 leading-relaxed max-w-3xl mx-auto">
            Welcome to Quiz Dangal! These Terms & Conditions govern your use of our platform. 
            By creating an account or using Quiz Dangal, you agree to be bound by these terms. 
            Please read them carefully before proceeding.
          </p>
        </header>

        {/* Important Notice */}
        <section className="bg-gradient-to-br from-amber-900/40 via-orange-900/30 to-red-900/30 backdrop-blur-xl border border-amber-700/50 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-amber-300">Important Notice</h2>
          </div>
          <p className="text-slate-300 leading-relaxed">
            If you do not agree with any part of these Terms & Conditions, please do not create an 
            account or use Quiz Dangal. Your use of the platform constitutes acceptance of these terms 
            and any future modifications.
          </p>
        </section>

        {/* Highlights */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {highlights.map((highlight, index) => (
            <div
              key={highlight.title}
              className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-xl p-4 text-center"
            >
              <div
                className={`bg-gradient-to-r ${getBrandGradient(index)} p-2.5 rounded-full w-10 h-10 mx-auto mb-2 flex items-center justify-center`}
              >
                <highlight.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{highlight.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{highlight.description}</p>
            </div>
          ))}
        </section>

        {/* Main Sections */}
        <div className="space-y-5">
          {sections.map((section, index) => (
            <section
              key={section.title}
              className="bg-gradient-to-br from-indigo-900/50 via-violet-900/40 to-fuchsia-900/40 backdrop-blur-xl border border-indigo-700/60 rounded-xl p-5"
            >
              <div className="flex items-start space-x-3 mb-4">
                <div
                  className={`bg-gradient-to-r ${getBrandGradient(index % 6)} p-2.5 rounded-full flex-shrink-0`}
                >
                  <section.icon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-violet-300 via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
                  {section.title}
                </h2>
              </div>

              <div className="space-y-3 ml-0 md:ml-12">
                {section.content.map((item, itemIndex) => (
                  <div
                    key={`${section.title}-${itemIndex}`}
                    className="flex items-start space-x-3"
                  >
                    <div className="w-1.5 h-1.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-full mt-2 flex-shrink-0" />
                    <p 
                      className="text-slate-300 text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: item }}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Warning Section */}
        <section className="bg-gradient-to-br from-red-900/40 via-rose-900/30 to-pink-900/30 backdrop-blur-xl border border-red-700/50 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <Ban className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-red-300 mb-2">Violation Consequences</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Breaking any of these rules may result in immediate consequences including: 
                disqualification from active quizzes, forfeiture of all earned coins and rewards, 
                temporary account suspension, or permanent ban from Quiz Dangal. We take fair play 
                seriously to ensure a level playing field for all users.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-xl p-6 text-center">
          <HelpCircle className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-3">Questions About These Terms?</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-4 max-w-lg mx-auto">
            If you have any questions, concerns, or need clarification about these Terms & Conditions, 
            please don&apos;t hesitate to contact our support team.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <a 
              href="mailto:support@quizdangal.com" 
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              <Mail className="w-4 h-4" />
              support@quizdangal.com
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/privacy-policy/" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
              Privacy Policy
            </Link>
            <Link to="/contact-us/" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
              Contact Us
            </Link>
            <Link to="/about-us/" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
              About Us
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TermsConditions;
