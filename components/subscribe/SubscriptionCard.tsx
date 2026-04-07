"use client";

const features = [
  "daily messages from your favorite girl",
  "memory and callback conversations",
  "story progression and life updates",
  "relationship streak rewards",
  "subscriber-only conversations",
  "priority late-night chats",
  "deeper emotional moments",
];

export default function SubscriptionCard() {
  const handleSubscribe = () => {
    // TODO: Trigger Stripe checkout session via API route
    window.location.href = "/api/checkout";
  };

  return (
    <div className="space-y-6">
      {/* Glassmorphism feature card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        {/* Card header */}
        <div className="flex items-center gap-2 mb-5">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className="text-purple-400"
          >
            <path
              d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
              fill="currentColor"
            />
          </svg>
          <h2 className="text-lg font-semibold text-white">
            First Month Together
          </h2>
        </div>

        {/* Feature checklist */}
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-400"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="text-white/80 text-sm leading-snug">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA button */}
      <button
        onClick={handleSubscribe}
        className="w-full py-4 rounded-2xl font-semibold text-white text-lg
          bg-gradient-to-r from-purple-600 to-purple-500
          hover:from-purple-500 hover:to-purple-400
          active:scale-[0.98] transition-all duration-150
          shadow-lg shadow-purple-500/25"
      >
        Start Free for 30 Days
      </button>
    </div>
  );
}
