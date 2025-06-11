'use client';

import React, { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';
import PageLayout from '../components/ui/PageLayout';

const ResetPasswordPage = () => {
  return (
    <PageLayout title="Reset Password">
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </PageLayout>
  );
};

export default ResetPasswordPage;
