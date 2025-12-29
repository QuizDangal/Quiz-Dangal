import React from 'react';
import SEO from '@/components/SEO';
import { Link } from 'react-router-dom';
import { 
  Target, Users, Trophy, Shield, CheckCircle, Star, Lightbulb, 
  Zap, Clock, Award, Globe, Smartphone,
  BookOpen, Brain, MessageSquare, Coins, Calendar, MapPin
} from 'lucide-react';
import { getBrandGradient, getBrandText } from '@/lib/brand';

const AboutUs = () => {
  // Core features
  const features = [
    {
      icon: Target,
      title: 'Daily Quizzes Across Categories',
      description: 'Fresh opinion polls, general knowledge, sports, and entertainment quizzes added every single day. Never run out of new challenges to test your knowledge.',
    },
    {
      icon: Trophy,
      title: 'Real-Time Leaderboards',
      description: 'Compete with players across India in live leaderboards. Track your ranking, compare scores, and climb to the top to prove your expertise.',
    },
    {
      icon: Coins,
      title: 'Earn Coins & Rewards',
      description: 'Every correct answer earns you coins. Accumulate coins through quizzes, daily streaks, and referrals. Redeem them for exciting rewards and prizes.',
    },
    {
      icon: Users,
      title: 'Refer & Earn Program',
      description: 'Invite friends and family to join Quiz Dangal. Both you and your friend earn bonus coins when they sign up using your unique referral code.',
    },
    {
      icon: Zap,
      title: 'Instant Results',
      description: 'Get immediate feedback on your quiz performance. See correct answers, track your accuracy, and learn from every question you attempt.',
    },
    {
      icon: Smartphone,
      title: 'Play Anywhere, Anytime',
      description: 'Quiz Dangal works seamlessly on mobile phones, tablets, and desktops. Access your account and play quizzes from any device with internet access.',
    },
  ];

  // Trust principles
  const principles = [
    {
      icon: Shield,
      text: 'Fair Play Guaranteed: Every quiz follows transparent rules with no hidden algorithms. Winners are determined purely by knowledge, accuracy, and speed.',
    },
    {
      icon: CheckCircle,
      text: 'Secure Data Protection: Your personal information and account data are protected with industry-standard encryption and security protocols.',
    },
    {
      icon: Award,
      text: 'Verified Rewards: All coin rewards and redemptions are processed transparently. What you earn is what you get—no hidden conditions.',
    },
    {
      icon: Clock,
      text: 'Real-Time Monitoring: Our platform continuously monitors for any unfair practices to ensure a level playing field for all participants.',
    },
  ];

  // How it works steps
  const howItWorks = [
    {
      step: 1,
      title: 'Create Your Free Account',
      description: 'Sign up with your email or phone number in seconds. No payment required to start playing quizzes.',
    },
    {
      step: 2,
      title: 'Choose Your Quiz Category',
      description: 'Browse from Opinion, GK, Sports, Movies, and more. Pick what interests you and start your quiz journey.',
    },
    {
      step: 3,
      title: 'Answer Questions & Earn Coins',
      description: 'Play quizzes, answer correctly, and watch your coin balance grow. The faster and more accurate you are, the more you earn.',
    },
    {
      step: 4,
      title: 'Climb Leaderboards',
      description: 'Compete with players nationwide. Your performance determines your ranking. Top players get special recognition.',
    },
    {
      step: 5,
      title: 'Redeem Your Rewards',
      description: 'Use your accumulated coins to redeem exciting rewards. Check our redemption section for available prizes.',
    },
  ];

  // Quiz categories
  const categories = [
    { icon: MessageSquare, name: 'Opinion Polls', desc: 'Share your views on trending topics' },
    { icon: Brain, name: 'General Knowledge', desc: 'Test your knowledge across subjects' },
    { icon: Trophy, name: 'Sports', desc: 'Cricket, football, Olympics & more' },
    { icon: Star, name: 'Entertainment', desc: 'Movies, music, celebrities & pop culture' },
  ];

  // FAQ data for schema
  const faqs = [
    { question: 'What is Quiz Dangal?', answer: 'Quiz Dangal is India\'s premier free-to-play quiz platform where users can participate in daily quizzes across multiple categories, earn coins, and redeem rewards. It combines learning with entertainment.' },
    { question: 'Is Quiz Dangal free to use?', answer: 'Yes, Quiz Dangal is completely free to join and play. There are no entry fees or hidden charges. All users start with equal opportunities.' },
    { question: 'How do I earn coins on Quiz Dangal?', answer: 'You can earn coins by answering quiz questions correctly, maintaining daily streaks, referring friends, and participating in special events. The more you play, the more you earn.' },
    { question: 'Can I play Quiz Dangal on my mobile?', answer: 'Yes, Quiz Dangal is a Progressive Web App (PWA) that works on all devices—smartphones, tablets, and computers. Simply visit quizdangal.com from any browser.' },
    { question: 'How are quiz winners determined?', answer: 'Winners are determined based on accuracy (correct answers) and speed (time taken to answer). Our system ensures fair play with no manipulation.' },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Quiz Dangal',
    url: 'https://quizdangal.com/',
    logo: 'https://quizdangal.com/android-chrome-512x512.png',
    description: 'India\'s premier quiz and rewards platform offering daily quizzes, leaderboards, and coin-based rewards.',
    foundingDate: '2025',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Jaipur',
      addressRegion: 'Rajasthan',
      addressCountry: 'India',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@quizdangal.com',
      contactType: 'customer support',
    },
    sameAs: [
      'https://www.instagram.com/quizdangal',
      'https://www.facebook.com/profile.php?id=61576614092243',
      'https://x.com/quizdangal',
    ],
  };

  return (
    <div className="min-h-screen pt-14 text-slate-100">
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-5xl">
        <SEO
          title="About Us - Quiz Dangal | India's #1 Free Quiz & Rewards Platform"
          description="Learn about Quiz Dangal - India's most exciting free quiz platform. Play daily quizzes on GK, sports, movies, earn coins, climb leaderboards, and win rewards. Join thousands of quiz enthusiasts today!"
          canonical="https://quizdangal.com/about-us/"
          alternateLocales={['hi_IN', 'en_US']}
          keywords={[
            'about quiz dangal',
            'quiz dangal team',
            'quiz app india',
            'play quiz win rewards',
            'free quiz app',
            'earn coins quiz',
            'indian quiz platform',
            'online quiz contest india',
          ]}
          jsonLd={[orgSchema, faqSchema]}
        />

        {/* Hero Section */}
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent mb-4">
            About Quiz Dangal
          </h1>
          <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
            Welcome to <strong>Quiz Dangal</strong> — India&apos;s most exciting quiz and rewards platform 
            where knowledge meets entertainment! We are on a mission to make learning fun and rewarding 
            for millions of Indians.
          </p>
        </header>

        {/* Our Story Section */}
        <section className="bg-gradient-to-br from-indigo-900/50 via-violet-900/40 to-fuchsia-900/40 backdrop-blur-xl border border-indigo-700/60 rounded-2xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-2 rounded-full">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent">
              Our Story
            </h2>
          </div>
          <div className="space-y-4 text-slate-300 text-sm md:text-base leading-relaxed">
            <p>
              Quiz Dangal was born from a simple observation: Indians love quizzes, but most platforms 
              either require payment to participate or don&apos;t reward players fairly. We saw an opportunity 
              to create something different—a platform that combines the thrill of competition with 
              genuine rewards, all without asking users to spend a single rupee.
            </p>
            <p>
              Founded in 2025 and headquartered in Jaipur, Rajasthan, Quiz Dangal started as a small 
              project with a big dream: to become India&apos;s go-to destination for free, fair, and fun 
              quizzing. Today, we host thousands of quizzes across multiple categories, with new 
              challenges added every single day.
            </p>
            <p>
              What sets us apart is our commitment to fairness and transparency. Every quiz on Quiz 
              Dangal is designed to reward genuine knowledge and quick thinking. There are no tricks, 
              no hidden algorithms—just pure skill-based competition.
            </p>
          </div>
        </section>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-gradient-to-br from-emerald-900/50 via-teal-900/40 to-cyan-900/40 backdrop-blur-xl border border-emerald-700/60 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-2 rounded-full">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-emerald-300">Our Mission</h2>
            </div>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              To democratize quizzing in India by providing a free, fair, and engaging platform where 
              anyone can test their knowledge, compete with others, and earn rewards—regardless of 
              their background or financial status. We believe knowledge should be celebrated and rewarded.
            </p>
          </section>

          <section className="bg-gradient-to-br from-purple-900/50 via-violet-900/40 to-pink-900/40 backdrop-blur-xl border border-purple-700/60 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-full">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-purple-300">Our Vision</h2>
            </div>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              To become the largest community of quiz enthusiasts in India, where millions of users 
              come together daily to learn, compete, and grow. We envision a future where Quiz Dangal 
              is synonymous with fun, fair, and rewarding quizzing.
            </p>
          </section>
        </div>

        {/* Quiz Categories */}
        <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent text-center mb-6">
            Quiz Categories We Offer
          </h2>
          <p className="text-slate-300 text-center text-sm md:text-base mb-6 max-w-2xl mx-auto">
            From current affairs to entertainment, we cover a wide range of topics to keep every 
            quiz lover engaged. Here&apos;s what you can explore:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat, index) => (
              <div
                key={cat.name}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center hover:border-indigo-500/50 transition-colors"
              >
                <div className={`bg-gradient-to-r ${getBrandGradient(index)} p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center`}>
                  <cat.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{cat.name}</h3>
                <p className="text-xs text-slate-400">{cat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Choose Quiz Dangal */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent text-center mb-6">
            Why Choose Quiz Dangal?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-xl p-5 shadow-lg hover:border-indigo-500/40 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`bg-gradient-to-r ${getBrandGradient(index)} p-2.5 rounded-full ring-2 ring-white/10 flex-shrink-0`}
                  >
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-gradient-to-br from-indigo-900/50 via-violet-900/40 to-fuchsia-900/40 backdrop-blur-xl border border-indigo-700/60 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent text-center mb-6">
            How Quiz Dangal Works
          </h2>
          <div className="space-y-4">
            {howItWorks.map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {item.step}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust & Safety */}
        <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Trust, Safety & Fair Play
            </h2>
          </div>
          <p className="text-slate-300 text-center text-sm md:text-base mb-6 max-w-2xl mx-auto">
            At Quiz Dangal, integrity is at the core of everything we do. We are committed to 
            providing a safe, fair, and transparent platform for all our users.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {principles.map((principle, index) => (
              <div key={index} className="flex items-start space-x-3 bg-slate-800/40 rounded-xl p-4">
                <principle.icon className={`w-5 h-5 ${getBrandText(index)} mt-0.5 flex-shrink-0`} />
                <p className="text-slate-300 text-sm leading-relaxed">{principle.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Company Info */}
        <section className="bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-xl font-bold text-white text-center mb-6">Company Information</h2>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Founded</h3>
              <p className="text-slate-400 text-sm">2025</p>
            </div>
            <div>
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Headquarters</h3>
              <p className="text-slate-400 text-sm">Jaipur, Rajasthan, India</p>
            </div>
            <div>
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Platform</h3>
              <p className="text-slate-400 text-sm">Web (PWA) - All Devices</p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent text-center mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <h3 className="text-base font-semibold text-white mb-2">{faq.question}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-indigo-600/80 via-purple-600/80 to-pink-600/80 backdrop-blur-xl border border-indigo-500/60 rounded-2xl p-6 md:p-8 text-center shadow-xl">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Star className="w-6 h-6 text-amber-300" />
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Join Quiz Dangal Today!
            </h2>
            <Star className="w-6 h-6 text-amber-300" />
          </div>
          <p className="text-slate-100 text-base leading-relaxed mb-4 max-w-2xl mx-auto">
            Become part of India&apos;s fastest-growing quiz community. Play daily quizzes, earn coins, 
            compete on leaderboards, and win exciting rewards—all for free!
          </p>
          <p className="text-white text-lg font-bold mb-6">
            Quiz Dangal — Play. Compete. Win.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-indigo-700 font-bold hover:bg-slate-100 transition-colors"
            >
              Start Playing Now
            </Link>
            <Link
              to="/contact-us/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white/10 border border-white/30 text-white font-bold hover:bg-white/20 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
