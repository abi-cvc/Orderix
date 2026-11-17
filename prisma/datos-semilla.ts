/**
 * Datos de la semilla base, compartidos por seed.ts (escribe con Prisma) y
 * semilla-sql.ts (genera SQL para pegar en el editor de Neon).
 * Todos los datos son ficticios.
 */
import { Rol } from "@/generated/prisma/enums";

// Clave de demostración SOLO para desarrollo. Se puede cambiar con SEED_PASSWORD.
// No es un secreto: cualquiera que lea el repositorio la conoce, por eso no se
// usa nunca para producción.
export const CLAVE_DEMO = "orderix-demo-2026";

export const USUARIOS: { nombre: string; correo: string; rol: Rol }[] = [
  { nombre: "Lucía Andrade", correo: "mesero@orderix.test", rol: Rol.MESERO },
  { nombre: "Carlos Benítez", correo: "mesero2@orderix.test", rol: Rol.MESERO },
  { nombre: "Diego Paredes", correo: "cocina@orderix.test", rol: Rol.COCINA },
  { nombre: "Sofía Cevallos", correo: "cajero@orderix.test", rol: Rol.CAJERO },
  { nombre: "Andrea Molina", correo: "admin@orderix.test", rol: Rol.ADMINISTRADOR },
];

export const PRODUCTOS: {
  nombre: string;
  categoria: string;
  precio: string;
  descripcion: string | null;
}[] = [
  {
    nombre: "Empanadas de viento",
    categoria: "Entradas",
    precio: "3.50",
    descripcion: "Dos empanadas con queso y azúcar",
  },
  {
    nombre: "Ceviche de camarón",
    categoria: "Entradas",
    precio: "8.90",
    descripcion: "Con chifles y canguil",
  },
  {
    nombre: "Locro de papa",
    categoria: "Entradas",
    precio: "4.75",
    descripcion: "Con queso, aguacate y maíz tostado",
  },
  {
    nombre: "Encebollado",
    categoria: "Platos fuertes",
    precio: "6.50",
    descripcion: "Albacora, yuca y cebolla curtida",
  },
  {
    nombre: "Llapingachos",
    categoria: "Platos fuertes",
    precio: "7.25",
    descripcion: "Tortillas de papa con chorizo y huevo",
  },
  {
    nombre: "Seco de pollo",
    categoria: "Platos fuertes",
    precio: "7.80",
    descripcion: "Con arroz amarillo y maduro",
  },
  {
    nombre: "Hornado",
    categoria: "Platos fuertes",
    precio: "9.50",
    descripcion: "Cerdo horneado con mote y agrio",
  },
  { nombre: "Jugo de naranjilla", categoria: "Bebidas", precio: "2.25", descripcion: null },
  { nombre: "Limonada", categoria: "Bebidas", precio: "2.00", descripcion: null },
  { nombre: "Café pasado", categoria: "Bebidas", precio: "1.75", descripcion: null },
  {
    nombre: "Higos con queso",
    categoria: "Postres",
    precio: "3.90",
    descripcion: "Higos en almíbar con queso fresco",
  },
  {
    nombre: "Helado de paila",
    categoria: "Postres",
    precio: "3.25",
    descripcion: "Sabor a mora o guanábana",
  },
];
