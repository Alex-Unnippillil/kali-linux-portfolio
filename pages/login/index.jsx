import LockScreen from '../../components/screen/lock_screen';

export default function LoginPage() {
  const handleLogin = () => {};

  return <LockScreen mode="login" onSubmit={handleLogin} />;
}

