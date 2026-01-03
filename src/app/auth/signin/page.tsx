import { Suspense } from 'react';
import SignInForm from './SignInForm';

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-0 px-2 sm:px-2 lg:px-2">
      <div className="max-w-md w-full space-y-0">
        <div>
          <h2 className="text-center text-2xl font-extrabold text-gray-900 mb-6">
            Agilize
          </h2>
        </div>
        <Suspense fallback={<div>Carregando...</div>}>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  )
}