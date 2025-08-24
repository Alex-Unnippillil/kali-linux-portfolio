import dynamic from 'next/dynamic';

const OTPApp = dynamic(() => import('../../components/apps/otp'), { ssr: false });

export default OTPApp;
