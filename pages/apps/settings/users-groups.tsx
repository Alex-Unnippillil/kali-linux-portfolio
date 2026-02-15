import { useState } from 'react';
import users from '../../../data/mock-users.json';

type User = {
  username: string;
  uid: number;
  groups: string[];
};

export default function UsersGroupsPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-4 text-ubt-grey bg-ub-cool-grey min-h-screen">
      <h1 className="text-xl mb-4">Users &amp; Groups</h1>
      <ul className="mb-6">
        {(users as User[]).map((user) => (
          <li key={user.uid} className="mb-1">
            <span className="font-bold">{user.username}</span> (uid: {user.uid}) – {user.groups.join(', ')}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          disabled
          className="px-3 py-1 bg-gray-700 text-white rounded opacity-50 cursor-not-allowed"
        >
          Add User
        </button>
        <button
          disabled
          className="px-3 py-1 bg-gray-700 text-white rounded opacity-50 cursor-not-allowed"
        >
          Remove User
        </button>
        <button
          disabled
          className="px-3 py-1 bg-gray-700 text-white rounded opacity-50 cursor-not-allowed"
        >
          Set Password
        </button>
        <button
          disabled
          className="px-3 py-1 bg-gray-700 text-white rounded opacity-50 cursor-not-allowed"
        >
          Group Membership
        </button>
      </div>
      <p className="mb-4">
        Most distributions provide GUI tools like <code>users-admin</code> for managing accounts. Xfce lacks a native user management utility, so these actions are disabled.
      </p>
      <button className="text-sky-400 underline" onClick={() => setShowModal(true)}>
        Learn more
      </button>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-ub-cool-grey p-4 rounded max-w-md">
            <h2 className="text-lg mb-2">User management in Linux</h2>
            <p className="mb-4">
              Tools such as <code>users-admin</code> or command line utilities like <code>useradd</code> and <code>usermod</code> are typically used to manage users. Consider installing a dedicated tool for your distribution if you need a graphical interface.
            </p>
            <button className="text-sky-400 underline" onClick={() => setShowModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
