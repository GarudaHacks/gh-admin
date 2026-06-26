# Garuda Hacks Admin Portal 🚀 

The official admin portal for Garuda Hacks 6.0, a premier hackathon event. Built with modern web technologies to provide a seamless experience for administrators.

## 🛠️ Tech Stack

- **Frontend**

  - Next.js 15
  - React 19
  - TypeScript
  - TailwindCSS
  - Vercel Analytics

- **Backend**

  - Firebase Cloud Functions
  - Firebase Authentication
  - Firebase Firestore

- **Deployment**
  - Vercel
  - Vercel Analytics

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository

```bash
git clone https://github.com/your-username/gh-admin.git
cd gh-admin
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp .env.example .env
```

Fill in your Firebase configuration in `.env`

4. Start development server

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

## 📁 Project Structure

```
gh-admin/
├── app/                # Next.js app directory
├── components/         # Reusable UI components
├── contexts/           # React context providers
├── lib/                # Utility functions and Firebase config
├── public/             # Static assets
├── static/             # Additional static files
├── .github/            # GitHub workflows and templates
├── firebase.json       # Firebase configuration
├── next.config.ts      # Next.js configuration
└── tailwind.config.ts  # Tailwind CSS configuration
```

## 🔧 Configuration

### Environment Variables

Required environment variables:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Make your changes following our commit conventions:

   ```bash
   # Format
   <type>(<scope>): <description>

   # Examples
   feat(auth): add Google OAuth login
   fix(api): resolve proxy configuration
   docs(readme): update installation steps
   style(ui): improve button hover states
   refactor(forms): simplify validation logic
   test(api): add auth endpoint tests
   chore(deps): update dependencies
   ```

   Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
   Scope: optional, indicates the module affected

4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Vercel](https://vercel.com/)

---

Made with ❤️ by the Garuda Hacks Team
