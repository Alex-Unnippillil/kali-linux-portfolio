import React from 'react';

const Contact = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <h2 className="text-lg mb-4">Contact</h2>
      <form className="contact-form" onSubmit={handleSubmit}>
        <input type="text" placeholder="Name" aria-label="Name" required />
        <input type="email" placeholder="Email" aria-label="Email" required />
        <textarea placeholder="Message" rows="4" aria-label="Message" required />
        <button type="submit">Send</button>
      </form>
      <div className="map-container" aria-label="Map">
        <iframe
          title="location"
          src="https://maps.google.com/maps?q=New%20York&t=&z=13&ie=UTF8&iwloc=&output=embed"
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

export default Contact;
export const displayContact = () => {
  return <Contact />;
};

