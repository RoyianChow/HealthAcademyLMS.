"use client";

import * as React from "react";
import { Phone, Mail, Map } from "lucide-react";
import { ContactForm } from "@/components/email/ContactForm";

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-16 px-6 py-12">
      {/* Contact Form Section */}
      <section className="bg-[#f7f7f3] px-6 py-16 md:px-10 lg:px-5">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4">
            <h2 className="text-4xl font-semibold tracking-tight text-[#232742] md:text-5xl">
              Contact Us
            </h2>
            <div className="mt-4 h-[2px] w-24 bg-[#7a9442]" />
          </div>
          <ContactForm />
          {/* Contact Info Footer */}
          <div className="mt-16 space-y-6">
            <h3 className="text-3xl font-bold text-[#7ec664]">
              You can also find us at:
            </h3>
            
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <Phone className="size-4 text-blue-400" />
                <span>647-568-6542</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="size-4 text-blue-400" />
                <span>happynutritionhealth@gmail.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Map className="size-4 text-blue-400" />
                <span>Yonge Street · Thornhill ON L3T 0C6</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
