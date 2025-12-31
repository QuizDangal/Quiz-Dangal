import React from 'react';
import SeoLanding from './SeoLanding';
import { Smile, Shield, BookOpen, Star } from 'lucide-react';

export default function QuizForKids() {
  const features = [
    { icon: Smile, title: 'Fun & Engaging', desc: 'Colorful, interactive quizzes that families will love' },
    { icon: Shield, title: 'Family-Friendly', desc: 'Safe, appropriate content supervised by parents' },
    { icon: BookOpen, title: 'Educational', desc: 'Learn while playing with age-appropriate questions' },
    { icon: Star, title: 'Rewarding', desc: 'Earn coins and celebrate achievements together' },
  ];

  const additionalContent = (
    <>
      {/* Parental Guidance Notice */}
      <div className="bg-amber-900/30 border border-amber-600/40 rounded-xl p-4 mb-6">
        <h3 className="font-bold text-amber-300 mb-2">👨‍👩‍👧 Parental Guidance Required</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          <strong>Important:</strong> If you&apos;re a minor, please use Quiz Dangal under parental/guardian supervision.
          Parents/guardians are responsible for ensuring appropriate use and monitoring activity.
        </p>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Quiz Categories for Family Play</h2>
      <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🌍 General Knowledge</h3>
          <p>Fun facts about animals, planets, countries, famous people, and interesting trivia that spark curiosity.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🎬 Movies & Entertainment</h3>
          <p>Questions about popular animated movies, cartoon characters, and kid-friendly entertainment content.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🏏 Sports for Kids</h3>
          <p>Easy sports trivia about cricket, football, and Olympic events that young sports fans will enjoy.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">💭 Opinion Polls</h3>
          <p>Fun opinion questions where there&apos;s no right or wrong answer — just share what you think!</p>
        </div>
      </div>
      <div className="mt-4 bg-green-900/20 border border-green-700/30 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-2">👨‍👩‍👧‍👦 Family Play Tips</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          Quiz Dangal is great for family bonding! Parents can play alongside kids, help with difficult questions, 
          and make learning a shared experience. The opinion polls are especially fun for the whole family to 
          discuss different viewpoints together.
        </p>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/quiz-for-kids"
      title="Quiz For Kids – Fun Online Quizzes | Quiz Dangal"
      h1="Quiz for Kids"
      description="Find fun, quick quiz-style rounds on Quiz Dangal. Great for light practice and family play — explore categories and play daily." 
      keywords={[
        'quiz for kids', 'quiz game', 'online quiz', 'general knowledge quiz',
        'kids quiz', 'children quiz', 'educational quiz for kids', 'fun quiz'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { to: '/quiz-questions/', label: 'Quiz Questions' },
        { to: '/category/opinion/', label: 'Opinion Quizzes' },
        { to: '/category/movies/', label: 'Movie Quizzes' },
        { to: '/gk-quiz/', label: 'GK Quiz' },
        { to: '/quiz-game/', label: 'Quiz Game' },
      ]}
      faqs={[
        {
          question: 'Can kids play Quiz Dangal?',
          answer: 'Quiz Dangal can be enjoyed as family-friendly quiz content. For minors, we recommend using the app under parental/guardian supervision and reviewing our Terms and Privacy Policy together.',
        },
        {
          question: 'Is Quiz Dangal safe for kids to play with parents?',
          answer: 'Absolutely! All our content is moderated and family-friendly. We don\'t have any adult, violent, or inappropriate content. Parents can play alongside their children for a fun family quiz time.',
        },
        {
          question: 'What categories are best for family play?',
          answer: 'Opinion polls and movie quizzes are especially great for families since there\'s no pressure to get the "right" answer in opinion polls. GK quizzes covering animals, planets, and fun facts are also popular for educational family time.',
        },
        {
          question: 'Can kids earn rewards?',
          answer: 'Yes! Kids can earn coins just like adult players by answering questions correctly. These coins can be accumulated and redeemed for rewards. It\'s a fun way to motivate learning!',
        },
        {
          question: 'Is it free for kids to play?',
          answer: 'Absolutely! Quiz Dangal is 100% free for everyone, including kids. No entry fees, no subscriptions, no in-app purchases required. Parents don\'t need to worry about any charges.',
        },
        {
          question: 'Can the whole family play together?',
          answer: 'Yes! Quiz Dangal is great for family quiz time. Take turns answering, compete for high scores, or discuss opinion poll questions together. It\'s a fun way to bond and learn as a family.',
        },
        {
          question: 'Are there educational quizzes for kids?',
          answer: 'Yes! Our GK category has educational content covering science, geography, history, and more. Playing quizzes regularly can supplement school learning and make education fun for kids.',
        },
      ]}
    />
  );
}
