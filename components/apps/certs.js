import React from 'react';
import Image from 'next/image';

const Certs = () => {
  const certBadges = [
    { src: "https://images.credly.com/images/a894153e-1762-4870-83b9-150ff294d7fb/image.png", alt: "AWS Knowledge: File Storage", href: "https://www.credly.com/badges/a1b8a861-f978-459a-a6c4-887b5c818e0b/public_url" },
    { src: "https://images.credly.com/images/180494db-68d2-4328-b223-0b60fd4b1cf1/blob", alt: "Advanced PostgreSQL for Amazon Aurora and Amazon RDS", href: "https://www.credly.com/badges/c9bce92a-558c-4a72-b743-a093cd749516/public_url" },
    { src: "https://images.credly.com/images/2b543538-c965-49d0-87c8-c00816cdab61/blob", alt: "Amazon Connect Fundamentals", href: "https://www.credly.com/badges/0449e5de-e879-4123-935b-88931e712734/public_url" },
    { src: "https://images.credly.com/images/9bcbde6d-1754-4617-9337-124f7b10a6c2/image.png", alt: "AWS Knowledge: Amazon EKS", href: "https://www.credly.com/badges/99343604-0605-4fa1-8fb6-a3a60fb837f1/public_url" },
    { src: "https://images.credly.com/images/eba18772-5ecf-471b-b8af-dda79815b544/image.png", alt: "AWS Knowledge: Compute", href: "https://www.credly.com/badges/a33748c9-81e3-4260-a4e6-5c5ba043d1c4/public_url" },
    { src: "https://images.credly.com/images/d7c2b294-d08e-4795-a342-88fc34df7e01/image.png", alt: "AWS Knowledge: Data Migration", href: "https://www.credly.com/badges/ddc87a40-c404-4954-acad-175d7ae172b7/public_url" },
    { src: "https://images.credly.com/images/65b806c9-c09d-4125-bfb0-8fc87f4699ac/image.png", alt: "AWS Knowledge: Events and Workflows", href: "https://www.credly.com/badges/1dc5114f-deea-402b-b181-27d7c829a124/public_url" },
    { src: "https://images.credly.com/images/478cdcb9-9b92-4893-9c95-617ad0f28257/blob", alt: "AWS Knowledge: Security Champion", href: "https://www.credly.com/badges/30c8b6de-3c7b-44a7-95c3-d3d909849934/public_url" },
    { src: "https://images.credly.com/images/e07c6cc4-b737-4d7e-8ce8-66b6b7a60367/image.png", alt: "AWS Knowledge: Serverless", href: "https://www.credly.com/badges/34e2df4b-6b96-4f69-a51f-fd9bd6961bd2/public_url" },
    { src: "https://images.credly.com/images/2784d0d8-327c-406f-971e-9f0e15097003/image.png", alt: "AWS Cloud Quest: Cloud Practitioner", href: "https://www.credly.com/badges/9fd585d2-17b2-4a38-8c93-bb1dccb6733d/public_url" },
    { src: "https://images.credly.com/images/b870667f-00a3-48d7-b988-9c02b441b883/image.png", alt: "Well-Architected Proficient", href: "https://www.credly.com/badges/db6a4332-d852-4fa1-bbbc-3bb67e55c0fd/public_url" },
    { src: "https://images.credly.com/images/80d8a06a-c384-42bf-ad36-db81bce5adce/blob", alt: "CompTIA Security+ ce Certification", href: "https://www.credly.com/badges/acea83f6-bcb7-4ce6-bb39-695a6ab0b5fa/public_url" },
    { src: "https://images.credly.com/images/e462102c-b2ee-4208-aca0-b58f53331266/image.png", alt: "Building Generative AI-Powered Applications with Python", href: "https://www.credly.com/badges/1b5a9be0-6779-46bc-ae94-4e5b1696a246/public_url" },
    { src: "https://images.credly.com/images/7658c4f1-0570-42c7-83b0-04cac8b0aca2/image.png", alt: "Generative AI Essentials", href: "https://www.credly.com/badges/ea93bf0b-dad7-4e7b-9945-34713c562d5b/public_url" },
    { src: "https://images.credly.com/images/afaacd18-d4a9-48af-b54c-846615756ec7/image.png", alt: "Generative AI Essentials for Software Developers", href: "https://www.credly.com/badges/797a4337-0a98-48ba-a0e2-2878c2e3fc7c/public_url" },
    { src: "https://images.credly.com/images/7fd5a03e-823f-4449-af43-59afe528f4ee/image.png", alt: "Generative AI: Prompt Engineering", href: "https://www.credly.com/badges/67576db4-b4a6-4593-ae5c-67b3c7c73e79/public_url" },
    { src: "https://images.credly.com/images/70675aed-31be-4c30-add7-b99905a34005/image.png", alt: "IBM AI Developer Professional Certificate", href: "https://www.credly.com/badges/53415f6e-162e-414e-971d-942aefc755d2/public_url" },
    { src: "https://images.credly.com/images/40bee502-a5b3-4365-90e7-57eed5067594/image.png", alt: "Python for Data Science and AI", href: "https://www.credly.com/badges/3a9b515f-ce02-4fa9-a617-598bfd62ccf6/public_url" },
    { src: "https://images.credly.com/images/33ed2910-9750-4613-aa2a-590e845c6edb/image.png", alt: "Python Project for AI and Application Development", href: "https://www.credly.com/badges/ee33babc-2577-465c-bcf6-c290e57e69dd/public_url" },
    { src: "https://images.credly.com/images/8647d8b6-2e29-4a88-bfb8-d5ba41ab5716/image.png", alt: "Software Developer Career Guide and Interview Preparation", href: "https://www.credly.com/badges/6eaf1f63-6852-4771-9e55-538aeac8687c/public_url" },
    { src: "https://images.credly.com/images/1b67aaf9-670d-4c92-8d51-7ac1190f0a42/image.png", alt: "Software Engineering Essentials", href: "https://www.credly.com/badges/bd138fc1-023b-4842-8c46-568321eaa1d8/public_url" },
    { src: "https://images.credly.com/images/0bf0f2da-a699-4c82-82e2-56dcf1f2e1c7/image.png", alt: "Google Cybersecurity Professional Certificate V2", href: "https://www.credly.com/badges/783aed9a-91a7-4a2e-a4b8-11dbd0d25fc2/public_url" },
    { src: "https://images.credly.com/images/9180921d-4a13-429e-9357-6f9706a554f0/image.png", alt: "ISC2 Candidate", href: "https://www.credly.com/badges/f1ec265d-6798-4fc0-b98e-ad5ac71f58c0/public_url" }
  ];
  return (
    <>
      <div className="font-medium relative text-2xl mt-2 md:mt-4 mb-4">
        Certifications & Typing Speed
        <div className="absolute pt-px bg-white mt-px top-full w-full">
          <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 left-full"></div>
          <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 right-full"></div>
        </div>
      </div>
      <ul className=" tracking-tight text-sm md:text-base w-10/12 emoji-list">
        <li className=" list-arrow text-sm md:text-base mt-4 leading-tight tracking-tight">
          <div>...and current certs and typing speed</div>
        </li>
      </ul>
      <div className="w-full md:w-10/12 flex flex-wrap justify-center items-center mt-4">
        <a href="https://data.typeracer.com/pit/profile?user=ulexa&ref=badge" target="_blank" rel="noopener noreferrer" className="m-2">
          <Image
            src="https://data.typeracer.com/misc/badge?user=ulexa"
            alt="TypeRacer.com scorecard for user ulexa"
            width={120}
            height={240}
            sizes="120px"
          />
        </a>
        {certBadges.map((badge) => (
          <a key={badge.href} href={badge.href} target="_blank" rel="noopener noreferrer" className="m-2">
            <Image
              src={badge.src}
              alt={badge.alt}
              className="w-24 h-24 md:w-28 md:h-28"
              width={112}
              height={112}
              sizes="(max-width: 768px) 96px, 112px"
            />
          </a>
        ))}
      </div>
    </>
  );
};

export default Certs;

