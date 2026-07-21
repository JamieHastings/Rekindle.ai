import { motion } from 'framer-motion';
import { HeartHandshake, CheckCircle } from 'lucide-react';

const SAMPLE_OUTPUTS = [
  {
    context: 'Forgot her birthday',
    message:
      "I know I let you down on your birthday, and there's no excuse for that. You deserved to feel celebrated and I wasn't there for it. I'm genuinely sorry — not just for missing the day, but for making you feel like an afterthought. That's not how I see you, and I'm going to do better.",
  },
  {
    context: 'Said something hurtful in an argument',
    message:
      "What I said during our argument was wrong, and I've been sitting with that. I got defensive and took it out on you in a way that wasn't fair. You didn't deserve that. I'm sorry — not because we argued, but because I made you feel attacked by someone who's supposed to have your back.",
  },
  {
    context: 'Went distant without explanation',
    message:
      "I pulled away and I didn't give you any explanation, and I know that hurt you. You were left guessing and that was unfair of me. I was going through something, but that doesn't make it okay to leave you in the dark. I'm sorry for the distance and for making you feel like it was your fault.",
  },
];

const WHAT_MAKES_IT_LAND = [
  {
    title: 'Acknowledge the specific hurt',
    desc: 'Don\'t apologize in vague terms. Name what you did. "I\'m sorry for missing your birthday" lands better than "I\'m sorry if I upset you."',
  },
  {
    title: 'Take responsibility without excuses',
    desc: 'Explaining context is okay. Deflecting blame isn\'t. There\'s a difference between "I was stressed, which doesn\'t excuse how I spoke to you" and "I only said that because you..."',
  },
  {
    title: 'Show you understand the impact',
    desc: "Reflect back how your actions made them feel. This shows you're not just apologizing to end the conflict — you actually get it.",
  },
  {
    title: "Don't rush to resolve it",
    desc: "A sincere apology doesn't demand forgiveness. End with what you intend to do differently, not with asking for an immediate resolution.",
  },
];

const FAQS = [
  {
    q: "How do I apologize when I don't know what to say?",
    a: "Start by acknowledging what happened without making excuses, then express how you feel and show you understand the impact it had. Rekindle's AI apology generator helps you put these into words — just describe what happened and it writes a genuine, specific apology for you.",
  },
  {
    q: 'What should I say in a text to apologize after a fight?',
    a: "A good apology text should name the specific thing that hurt them, take responsibility without deflecting, and express a genuine desire to do better — not just 'I'm sorry you felt that way.' Rekindle generates apology messages tailored to your situation so they feel personal, not like a script.",
  },
  {
    q: 'How do I write a heartfelt apology message?',
    a: "A heartfelt apology is specific, not generic. It names what you did, shows you understand why it hurt, and doesn't make excuses. Rekindle's AI apology generator lets you describe the situation in your own words and produces a message that sounds like you — honest and genuine.",
  },
  {
    q: 'Is an AI-generated apology text genuine?',
    a: "Yes — the feelings behind your apology are yours. Rekindle uses the details you provide (what happened, who you're apologizing to, the tone you want) to write something that reflects your actual situation. It helps you say what you mean when the right words are hard to find.",
  },
  {
    q: 'How long should an apology message be?',
    a: 'It depends on the situation. A short, sincere text works well for minor misunderstandings. A longer message is more appropriate for serious hurt. Rekindle lets you choose the length — short, medium, or long — so it fits what you need.',
  },
];

interface ApologyLandingPageProps {
  onStartGenerator: () => void;
}

export default function ApologyLandingPage({ onStartGenerator }: ApologyLandingPageProps) {
  return (
    <div>
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto px-6 py-20 text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#CC4F4E]/10 border border-[#CC4F4E]/20 rounded-full mb-8">
          <HeartHandshake className="w-4 h-4 text-[#CC4F4E]" />
          <span className="text-sm text-[#CC4F4E] font-medium">Free to try — no account needed</span>
        </div>

        <h1 className="font-heading text-5xl md:text-6xl font-bold text-text-dark mb-6 leading-tight">
          Say Sorry the Right Way
        </h1>
        <p className="text-xl md:text-2xl text-[#CC4F4E] font-medium mb-4">
          AI Apology Message Generator
        </p>
        <p className="text-lg text-text-light mb-10 max-w-2xl mx-auto leading-relaxed">
          Describe what happened and who you're apologizing to. Rekindle writes a heartfelt, specific apology message that sounds like you — not a script.
        </p>

        <motion.button
          onClick={onStartGenerator}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-10 py-5 text-lg bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-medium"
        >
          Generate My Apology Message
        </motion.button>

        <p className="text-text-light text-sm mt-4">Takes 30 seconds. No account needed to preview.</p>
      </motion.section>

      {/* What makes an apology land */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-border">
        <h2 className="text-3xl font-bold text-text-dark mb-4 text-center">
          What makes an apology actually land
        </h2>
        <p className="text-text-light text-center mb-12 max-w-2xl mx-auto">
          Most apologies fail because they're vague, defensive, or feel like a formality. Here's what
          separates a real apology from one that creates more distance.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {WHAT_MAKES_IT_LAND.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-panel border border-border rounded-xl p-6"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#CC4F4E] mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-text-dark mb-2">{item.title}</h3>
                  <p className="text-text-light text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sample outputs */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-border">
        <h2 className="text-3xl font-bold text-text-dark mb-4 text-center">
          Example apology messages
        </h2>
        <p className="text-text-light text-center mb-12 max-w-2xl mx-auto">
          Here's what Rekindle generates for a few common situations. Every message is tailored to what
          you provide — these are just illustrative examples.
        </p>
        <div className="space-y-6">
          {SAMPLE_OUTPUTS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-panel border border-border rounded-xl p-6"
            >
              <div className="text-xs font-semibold text-[#CC4F4E] uppercase tracking-wider mb-3">
                Situation: {item.context}
              </div>
              <p className="text-text-dark leading-relaxed">"{item.message}"</p>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <motion.button
            onClick={onStartGenerator}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-10 py-5 text-lg bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-medium"
          >
            Write My Apology Message
          </motion.button>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-border">
        <h2 className="text-3xl font-bold text-text-dark mb-12 text-center">Common questions</h2>
        <div className="space-y-8">
          {FAQS.map((faq, i) => (
            <div key={i} className="border-b border-border pb-8 last:border-0 last:pb-0">
              <h3 className="font-semibold text-text-dark mb-3">{faq.q}</h3>
              <p className="text-text-light leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-border text-center">
        <h2 className="text-3xl font-bold text-text-dark mb-4">
          Put your feelings into words
        </h2>
        <p className="text-text-light mb-8 max-w-xl mx-auto">
          You know what you want to say. Rekindle helps you say it well.
        </p>
        <motion.button
          onClick={onStartGenerator}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-10 py-5 text-lg bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-medium"
        >
          Generate My Apology Message
        </motion.button>
      </section>
    </div>
  );
}
