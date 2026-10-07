# MachineGuard Landing Page

Landing Page de **MachineGuard**, la plataforma SaaS + IoT de monitoreo de temperatura y humedad para almacenes de PyMEs industriales.

Implementa el Bounded Context **Customer Acquisition** y las User Stories US13, US14 y US15 del informe del proyecto ([MachineGuard-Documentation](https://github.com/MachineGuard/MachineGuard-Documentation)).

## Tecnologías

HTML5, CSS3 y JavaScript sin frameworks ni dependencias de compilación.

## Flujo de ramas (GitFlow)

| Rama | Uso |
|---|---|
| `main` | Versión estable publicada en GitHub Pages |
| `develop` | Integración de funcionalidades |
| `feature/<tarea>` | Nuevas funcionalidades, se integran a `develop` |
| `release/<versión>` | Preparación de una versión, se integra a `main` y `develop` |
| `hotfix/<versión>-<incidencia>` | Correcciones urgentes sobre `main` |

Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/) (`feat(landing):`, `fix(landing):`, `docs:`, `chore:`) y las versiones siguen Semantic Versioning.
