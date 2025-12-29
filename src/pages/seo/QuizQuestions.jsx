import React from 'react';
import SeoLanding from './SeoLanding';
import { Brain, Target, Zap, Trophy } from 'lucide-react';

export default function QuizQuestions() {
  const features = [
    { icon: Brain, title: 'Diverse Topics', desc: 'Questions across GK, Sports, Movies, Science, and trending Opinion polls' },
    { icon: Target, title: 'All Difficulty Levels', desc: 'From easy warmups to challenging brain-teasers for quiz champions' },
    { icon: Zap, title: 'Daily Fresh Content', desc: 'New quiz questions added every day to keep you engaged and learning' },
    { icon: Trophy, title: 'Learn & Earn', desc: 'Answer correctly to earn coins and climb the national leaderboards' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Types of Quiz Questions on Quiz Dangal</h2>
      <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">📚 General Knowledge Questions</h3>
          <p>Test your knowledge about world history, geography, famous personalities, science facts, and current events. Our GK questions cover everything from ancient civilizations to modern innovations.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🏏 Sports Quiz Questions</h3>
          <p>From cricket legends to football champions, our sports questions cover IPL, World Cup, Olympics, and more. Perfect for sports enthusiasts who love trivia!</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🎬 Entertainment & Movies</h3>
          <p>Bollywood dialogues, Hollywood trivia, music questions, and celebrity facts. Test how well you know your favorite films and stars.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">💭 Opinion Poll Questions</h3>
          <p>Share your opinions on trending topics and see how your views compare with thousands of other players. No right or wrong — just fun!</p>
        </div>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/quiz-questions"
      title="Quiz Questions – Free Online Quiz Questions | Quiz Dangal"
      h1="Quiz Questions"
      description="Practice free quiz questions across GK, sports, movies, and opinion polls. Play daily, earn coins, and climb the Quiz Dangal leaderboards."
      keywords={[
        'quiz questions',
        'online quiz questions',
        'daily quiz',
        'india quiz',
        'quiz app',
        'gk questions with answers',
        'trivia questions',
        'quiz questions in hindi',
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { href: '/category/gk/', label: 'GK Quiz' },
        { href: '/category/sports/', label: 'Sports Quiz' },
        { href: '/category/movies/', label: 'Movie Quiz' },
        { href: '/category/opinion/', label: 'Opinion Quiz' },
        { href: '/leaderboards/', label: 'Leaderboards' },
        { href: '/gk-questions/', label: 'GK Questions' },
        { href: '/quiz-questions-with-answers/', label: 'Questions with Answers' },
      ]}
      faqs={[
        {
          question: 'Are these quiz questions free to play?',
          answer: 'Yes, absolutely! Quiz Dangal is 100% free to play. You can participate in unlimited quizzes without any entry fees or hidden charges. We earn through advertisements, so you never have to pay to play.',
        },
        {
          question: 'Do you have quiz questions with answers?',
          answer: 'Yes! After completing each quiz, you can review the results and see the correct answers. This helps you learn from mistakes and improve your knowledge over time. Check our Quiz Questions with Answers page for detailed explanations.',
        },
        {
          question: 'Which topics are covered in your quiz questions?',
          answer: 'We cover a wide range of topics including General Knowledge (GK), Sports (Cricket, Football, Olympics), Movies (Bollywood, Hollywood), Science, Current Affairs, History, Geography, and fun Opinion polls. New categories are added regularly!',
        },
        {
          question: 'How often are new quiz questions added?',
          answer: 'We add fresh quiz questions every single day! Our content team creates new quizzes daily across all categories. You can also participate in live quizzes and special event-based rounds.',
        },
        {
          question: 'Can I play quiz questions in Hindi?',
          answer: 'Yes! Many of our quizzes are available in Hindi and English. We cater to Indian audiences with content in both languages. Check out our Hindi Quiz page for Hindi-language quizzes.',
        },
        {
          question: 'How do I earn rewards from answering quiz questions?',
          answer: 'Every correct answer earns you coins! The faster you answer, the more bonus coins you get. Accumulated coins can be redeemed for exciting rewards. Top scorers also appear on our national leaderboards.',
        },
        {
          question: 'Are the quiz questions suitable for all ages?',
          answer: 'Yes, our quiz questions are family-friendly and suitable for all ages. We have easier questions for beginners and kids, as well as challenging ones for quiz champions. All content is moderated for appropriateness.',
        },
      ]}
    />
  );
}
