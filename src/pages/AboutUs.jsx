import React from 'react';
// Removed framer-motion for lighter public page
import SEO from '@/components/SEO';
import { Target, Users, Trophy, Shield, CheckCircle, Star } from 'lucide-react';
import { getBrandGradient, getBrandText } from '@/lib/brand';

const AboutUs = () => {
  // Compact: Top benefits
  const features = [
    {
      icon: Target,
      title: 'Daily Quizzes',
      description: 'Fresh opinion and knowledge quizzes every day.',
    },
    {
      icon: Trophy,
      title: 'Leaderboards',
      description: 'Compete, climb ranks, and showcase your skills.',
    },
    {
      icon: Shield,
      title: 'Coins & Rewards',
      description: 'Earn coins for correct answers and redeem rewards.',
    },
    {
      icon: Users,
      title: 'Refer & Earn',
      description: 'Invite friends and unlock extra benefits together.',
    },
  ];

  // Compact: Trust, Safety & Fair Play
  const principles = [
    'Every quiz is fair and transparent.',
    'User data and transactions are securely protected.',
  ];

  return (
    <div className="min-h-screen pt-14 text-slate-100">
      <div className="container mx-auto px-4 py-4 space-y-5">
        <SEO
          title="About Us - Quiz Dangal"
          description="Quiz Dangal - India's most exciting quiz and rewards platform where knowledge meets entertainment."
          canonical="https://quizdangal.com/about-us/"
          alternateLocales={['hi_IN', 'en_US']}
          keywords={[
            'about quiz dangal',
            'quiz dangal team',
            'quiz app india',
            'play quiz win rewards',
          ]}
        />

        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent mb-2">
            About Us - Quiz Dangal
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Welcome to Quiz Dangal - India&apos;s most exciting quiz and rewards platform where knowledge
            meets entertainment!
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/50 via-violet-900/40 to-fuchsia-900/40 backdrop-blur-xl border border-indigo-700/60 rounded-xl p-4 space-y-3 shadow-xl pt-10">
          <h2 className="text-lg font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent mb-2">
            Our Vision & Mission
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            We built Quiz Dangal with the mission to give everyone a fair chance to showcase their
            talent, challenge their mind, and win exciting rewards. Here, it&apos;s not just about
            playing quizzes - it&apos;s about learning, competing, and enjoying at the same time.
          </p>
          <p className="text-slate-300 text-sm leading-relaxed">
            Our mission is simple:{' '}
            <strong>&quot;To make quizzing fun, fair, and rewarding for everyone.&quot;</strong>
          </p>
        </div>

        {/* Removed duplicate intro card for "Why Choose" to keep content concise */}

        <div className="space-y-4">
          <h2 className="text-lg font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent text-center">
            Why Choose Quiz Dangal?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-xl p-4 shadow-lg"
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`bg-gradient-to-r ${getBrandGradient(index)} p-2 rounded-full ring-2 ring-white/10`}
                  >
                    <feature.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-slate-300 text-xs leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/50 via-violet-900/40 to-fuchsia-900/40 backdrop-blur-xl border border-indigo-700/60 rounded-xl p-4 space-y-3 shadow-xl">
          <h2 className="text-lg font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent mb-2">
            Trust, Safety & Fair Play
          </h2>
          <div className="space-y-2">
            {principles.map((principle, index) => (
              <div key={index} className="flex items-start space-x-2">
                <CheckCircle className={`w-4 h-4 ${getBrandText(index)} mt-0.5 flex-shrink-0`} />
                <p className="text-slate-300 text-xs leading-relaxed">{principle}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/50 via-violet-900/40 to-fuchsia-900/40 backdrop-blur-xl border border-indigo-700/60 rounded-xl p-4 space-y-3 shadow-xl">
          <h2 className="text-lg font-bold gradient-text mb-2">Our Vision</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Quiz Dangal is not just an app - it&apos;s a community of quiz lovers where players learn,
            enjoy, and turn their knowledge into real rewards. We believe that knowledge is power,
            and competing with knowledge makes the experience even more exciting.
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-xl p-4 text-center shadow-lg">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Star className="w-5 h-5 text-amber-300" />
            <h2 className="text-lg font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent">
              Join Us Today!
            </h2>
            <Star className="w-5 h-5 text-amber-300" />
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            The Quiz Dangal Promise: Stay engaged daily, learn something new, compete with others,
            and win rewards along the way.
          </p>
          <p className="text-slate-200 text-sm leading-relaxed font-semibold">
            Quiz Dangal - Play. Compete. Win.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
