-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "group_muscle" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "equipment" TEXT,
    "load_unit" TEXT NOT NULL DEFAULT 'kg',
    "is_custom" BOOLEAN NOT NULL DEFAULT true,
    "media_online" TEXT,
    "media_local" TEXT,
    "musculo_alvo" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    "deleted_at" TEXT,
    "dirty" BOOLEAN NOT NULL DEFAULT true,
    "server_rev" TEXT,
    "user_id" TEXT,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treinos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objetivo" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    "deleted_at" TEXT,
    "dirty" BOOLEAN NOT NULL DEFAULT true,
    "server_rev" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "treinos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treino_exercicios" (
    "id" TEXT NOT NULL,
    "treino_id" TEXT NOT NULL,
    "exercicio_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "series_recomendadas" INTEGER,
    "execucoes_recomendadas" INTEGER,
    "carga_padrao" DOUBLE PRECISION,
    "tempo_descanso_segundos" INTEGER,
    "metodo" TEXT NOT NULL DEFAULT 'normal',
    "grupo_id" TEXT,

    CONSTRAINT "treino_exercicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessao_treinos" (
    "id" TEXT NOT NULL,
    "treino_id" TEXT NOT NULL,
    "treino_nome_snapshot" TEXT NOT NULL,
    "data_hora_inicio" TEXT NOT NULL,
    "data_hora_fim" TEXT,
    "status" TEXT NOT NULL,
    "arquivado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    "deleted_at" TEXT,
    "dirty" BOOLEAN NOT NULL DEFAULT true,
    "server_rev" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "sessao_treinos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessao_exercicios" (
    "id" TEXT NOT NULL,
    "sessao_treino_id" TEXT NOT NULL,
    "exercicio_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome_snapshot" TEXT NOT NULL,
    "grupo_muscular_snapshot" TEXT NOT NULL,
    "categoria_snapshot" TEXT NOT NULL,
    "equipamento_snapshot" TEXT,
    "musculo_alvo_snapshot" TEXT,
    "nome_original_snapshot" TEXT,
    "realizado" BOOLEAN NOT NULL DEFAULT true,
    "series_recomendadas" INTEGER,
    "execucoes_recomendadas" INTEGER,
    "carga_padrao" DOUBLE PRECISION,
    "tempo_descanso_segundos" INTEGER,
    "metodo" TEXT NOT NULL DEFAULT 'normal',
    "grupo_id" TEXT,
    "substituido_por_exercicio_id" TEXT,
    "substituicao_motivo" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    "deleted_at" TEXT,
    "dirty" BOOLEAN NOT NULL DEFAULT true,
    "server_rev" TEXT,

    CONSTRAINT "sessao_exercicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_registradas" (
    "id" TEXT NOT NULL,
    "sessao_exercicio_id" TEXT NOT NULL,
    "tipo_serie" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "carga_kg" DOUBLE PRECISION NOT NULL,
    "repeticoes" INTEGER NOT NULL,
    "observacao" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    "deleted_at" TEXT,
    "dirty" BOOLEAN NOT NULL DEFAULT true,
    "server_rev" TEXT,

    CONSTRAINT "series_registradas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_peso" (
    "id" TEXT NOT NULL,
    "peso_kg" DOUBLE PRECISION NOT NULL,
    "data_registro" TEXT NOT NULL,
    "observacao" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    "deleted_at" TEXT,
    "dirty" BOOLEAN NOT NULL DEFAULT true,
    "server_rev" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "registros_peso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key_key" ON "user_settings"("user_id", "key");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treinos" ADD CONSTRAINT "treinos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treino_exercicios" ADD CONSTRAINT "treino_exercicios_treino_id_fkey" FOREIGN KEY ("treino_id") REFERENCES "treinos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_treinos" ADD CONSTRAINT "sessao_treinos_treino_id_fkey" FOREIGN KEY ("treino_id") REFERENCES "treinos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_treinos" ADD CONSTRAINT "sessao_treinos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_exercicios" ADD CONSTRAINT "sessao_exercicios_sessao_treino_id_fkey" FOREIGN KEY ("sessao_treino_id") REFERENCES "sessao_treinos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_registradas" ADD CONSTRAINT "series_registradas_sessao_exercicio_id_fkey" FOREIGN KEY ("sessao_exercicio_id") REFERENCES "sessao_exercicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_peso" ADD CONSTRAINT "registros_peso_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
