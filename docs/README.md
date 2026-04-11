# Hive Documentation

Documentation for the Hive system, organized according to the C4 model.

## Structure

### C4 Model Documentation

The documentation follows the C4 model, which provides four levels of abstraction:

1. **01-system-context.md** - C4 Level 1: System Context
   - High-level view of the system and its users
   - External actors and their relationships
   - System boundaries

2. **02-containers.md** - C4 Level 2: Container Diagram
   - Technical building blocks (containers)
   - Web Application, Backend API, Database
   - Communication flows between containers

3. **03-components-backend.md** - C4 Level 3: Backend Components
   - Components within the Backend API container
   - Routes, Services, Repositories
   - Component interactions and data flow

4. **03-components-frontend.md** - C4 Level 3: Frontend Components
   - Components within the Web Application container
   - Pages, Components, Redux Store, API Layer
   - State management and component relationships

5. **04-code.md** - C4 Level 4: Code-Level Details
   - Implementation details and code patterns
   - Key design decisions
   - Code references and examples

### Additional Documentation

- **api-reference.md** - Complete API documentation
  - Endpoints, request/response schemas
  - Authentication details
  - Error handling
  - Rate limiting

- **integration-guide.md** - Integration testing guide
  - Test setup and execution
  - Database seeding
  - Test cleanup

- **presentation.md** - 5-minute presentation script
  - Quick overview for recruiters
  - Key talking points
  - Demo script

### Diagrams

The `diagrams/` directory contains additional visual diagrams (SVG format).

## Reading Order

For new readers, recommended reading order:

1. Start with **01-system-context.md** to understand the big picture
2. Read **02-containers.md** to see the high-level architecture
3. Dive into **03-components-backend.md** and **03-components-frontend.md** for component details
4. Reference **04-code.md** for implementation specifics
5. Use **api-reference.md** when integrating with the API

## Diagram Rendering

All diagrams use standard Mermaid syntax (compatible with GitHub). To render them:

- **GitHub**: Automatically renders Mermaid diagrams
- **VS Code**: Install "Markdown Preview Mermaid Support" extension
- **Online**: Use [Mermaid Live Editor](https://mermaid.live)

Note: Diagrams use standard `graph TD` syntax for maximum compatibility. C4 model concepts are represented using subgraphs and styled nodes.

## Maintenance

When updating documentation:

1. Keep C4 levels consistent (don't skip levels)
2. Update diagrams when architecture changes
3. Keep code references in `04-code.md` up to date
4. Update API docs when endpoints change

---

For questions or improvements, refer to the main project README.

