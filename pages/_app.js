import { useEffect } from 'react'
import ReactGA from 'react-ga4'
import 'tailwindcss/tailwind.css'
import '../styles/index.css'

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    ReactGA.initialize(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)
  }, [])

  return <Component {...pageProps} />
}

export default MyApp
