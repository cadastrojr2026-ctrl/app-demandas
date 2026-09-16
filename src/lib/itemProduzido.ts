import { z } from "zod";

// Item efetivamente produzido pra atender uma demanda: código da peça + quantidade. Uma
// demanda pode ter vários (mesmo padrão de "vários códigos" já usado hoje na descrição) —
// validação compartilhada entre criar (POST) e editar (PATCH) uma demanda.
export const itemSchema = z.object({
  codigo: z.string().trim().min(1, "Código do item não pode ser vazio.").max(50),
  quantidade: z
    .coerce
    .number()
    .int("Quantidade deve ser um número inteiro.")
    .positive("Quantidade deve ser maior que zero."),
});

export const itensSchema = z.array(itemSchema).max(50).optional();
