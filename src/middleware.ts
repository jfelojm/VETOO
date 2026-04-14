import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

/** Sin matcher = aplica a todas las rutas (aquí solo devuelve next). */