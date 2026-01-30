'use client';

import React, { useState } from 'react';

interface FAQItem {
    question: string;
    answer: string;
}

const FAQS: FAQItem[] = [
    {
        question: "What happens if I run out of credits?",
        answer: "If you run out of credits, you can easily top up your account with additional credit packs starting at $10. Your subscription will also automatically renew your monthly allowance at the start of your next billing cycle."
    },
    {
        question: "Can I upgrade or downgrade my plan?",
        answer: "Yes, you can upgrade or downgrade your plan at any time from your account settings. Changes to your plan will take effect immediately, and any price difference will be prorated."
    },
    {
        question: "Do my unused credits roll over?",
        answer: "Unused credits do not roll over on the Free and Starter plans. However, on the Professional and Team plans, we offer a 3-month credit rollover feature, allowing you to accumulate unused credits for future use."
    },
    {
        question: "What is the difference between monthly and annual billing?",
        answer: "Annual billing offers a significant discount (20% off) compared to monthly billing. You are billed once per year for the entire 12-month period, whereas monthly billing charges you every month."
    },
    {
        question: "Is there a free trial for paid plans?",
        answer: "We offer a Free plan that gives you 150 monthly credits forever, so you can test out our features before committing to a paid subscription. We do not offer separate trials for the paid tiers."
    }
];

export default function PricingFAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-normal text-center mb-12 text-black tracking-tight">
                Frequently asked questions
            </h2>
            <div className="space-y-4">
                {FAQS.map((faq, index) => (
                    <div
                        key={index}
                        className="border-b border-black/10 last:border-0"
                    >
                        <button
                            className="w-full py-6 flex items-center justify-between text-left focus:outline-none group"
                            onClick={() => toggleFAQ(index)}
                        >
                            <span className="text-lg font-medium text-gray-900 group-hover:text-black transition-colors">
                                {faq.question}
                            </span>
                            <span className={`transform transition-transform duration-200 ${openIndex === index ? 'rotate-180' : ''}`}>
                                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </span>
                        </button>
                        <div
                            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${openIndex === index ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'
                                }`}
                        >
                            <p className="text-gray-600 leading-relaxed pr-8">
                                {faq.answer}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
