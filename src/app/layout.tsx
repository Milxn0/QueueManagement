import './globals.css'
import { Prompt } from 'next/font/google'

const prompt = Prompt({
  subsets: ['latin', 'thai'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], // Prompt supports all these weights
  variable: '--font-prompt',
})

export const metadata = {
  title: 'Seoul Korean BBQ Reservation',
  description: 'Reservation website',
  icons: {
    icon: '/logo.jpg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={prompt.variable} >
      <head>  
      </head>
      <body className={prompt.className} >{children}</body>
    </html>
  )
}
