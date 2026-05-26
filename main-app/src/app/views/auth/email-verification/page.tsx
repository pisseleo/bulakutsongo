const EmailVerificationPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Verificação de Email</h1>
      <p className="text-gray-600 mb-6">
        Verifique seu email para acessar sua conta. Se você não recebeu o email de verificação, clique no botão abaixo para reenviar.
      </p>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => window.location.reload()}
      >
        Reenviar Email de Verificação
      </button>
    </div>
  );
};

export default EmailVerificationPage;

