import Image from "next/image";

export default function LegalDisclaimerPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 md:py-24">
      <div className="grid grid-cols-1 gap-12 items-center md:grid-cols-12">
        
        {/* Left Column: Academy Logo */}
        <div className="flex justify-center md:col-span-5">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-full md:max-w-[380px] aspect-square">
            <Image
              src="/logo.png"
              alt="Happy Nutrition Academy Logo"
              fill
              priority
              className="object-contain"
            />
          </div>
        </div>

        {/* Right Column: Disclaimer Text Content */}
        <div className="space-y-6 md:col-span-7">
          <h1 className="text-3xl font-bold tracking-tight text-[#5cb3e4] md:text-4xl lg:text-5xl">
            Legal Disclaimer
          </h1>
          
          <p className="text-base leading-8 text-neutral-600 md:text-lg md:leading-9">
            The content on{" "}
            <strong className="font-bold text-neutral-900">HealthAcademy.ca</strong>{" "}
            by{" "}
            <strong className="font-bold text-neutral-900">Happy Nutrition Ltd.</strong>{" "}
            is provided for{" "}
            <strong className="font-bold text-neutral-900">
              educational and informational purposes only
            </strong>
            . It is{" "}
            <strong className="font-bold text-neutral-900">
              not intended to diagnose, treat, cure, or prevent any disease
            </strong>{" "}
            and should not be considered a substitute for professional medical advice, 
            diagnosis, or treatment. Always consult your physician or other qualified 
            healthcare provider with any questions you may have about a medical condition, 
            your health, or before starting any new program, supplement, or lifestyle change. 
            Reliance on any information provided by HealthAcademy.ca is{" "}
            <strong className="font-bold text-neutral-900">
              solely at your own risk
            </strong>
            .
          </p>
        </div>

      </div>
    </main>
  );
}
