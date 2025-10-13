"use client";

import dynamic from "next/dynamic";
import Head from "next/head";
import { useEffect } from "react";
import { logContactFunnelStep } from "../utils/analytics";

const ContactApp = dynamic(() => import("../apps/contact"), {
  ssr: false,
});

const ContactPage: React.FC = () => {
  useEffect(() => {
    logContactFunnelStep("view_contact_entry", { surface: "page-contact" });
  }, []);

  return (
    <>
      <Head>
        <title>Contact | Kali Linux Portfolio</title>
        <meta
          name="description"
          content="Reach out to Alex Unnippillil for security workshops, research collaborations, and portfolio inquiries."
        />
      </Head>
      <ContactApp />
    </>
  );
};

export default ContactPage;
