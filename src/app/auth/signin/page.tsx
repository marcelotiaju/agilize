import { Suspense } from 'react';
import SignInForm from './SignInForm';

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-1 px-4 sm:px-4 lg:px-6">
      <div className="max-w-md w-full space-y-1">
        <div>
          <h2 className="text-center text-2xl font-extrabold text-gray-900">
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