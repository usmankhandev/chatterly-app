# Chatterly Architecture - Mermaid Diagrams

## 1. Phase Dependencies Architecture

```mermaid
graph TD
    A["<b>PHASE 1<b><br/>Foundation"] --> B["Phase 1.1: Redis<br/>Caching"]
    B --> C["Phase 1.2: Rate<br/>Limiting"]
    C --> D["Phase 1.3: Logging<br/>& Monitoring"]
    D --> E{{"PHASE 1<br/>COMPLETE ✅"}}

    E --> F["Phase 2: Async<br/>Processing<br/>Bull Queues"]
    E --> G["Phase 5.1: NestJS<br/>Gateway<br/>(Parallel Track)"]

    F --> H["Phase 3: Search &<br/>Analytics<br/>Elasticsearch"]
    H --> I["Phase 4: Reliability<br/>Patterns<br/>Circuit Breaker"]
    I --> J["Phase 5: Microservices<br/>Extraction<br/>NestJS Services"]
    G --> J

    J --> K["Phase 6: Advanced<br/>Features<br/>gRPC + Kafka"]
    K --> L["Phase 7: DevOps<br/>& Kubernetes"]
    L --> M["Phases 8-10:<br/>Enterprise<br/>Features"]

    M --> N{{"COMPLETE ✅<br/>Production Ready"}}

    style A fill:#ff6b6b
    style E fill:#51cf66
    style N fill:#4dabf7
    style J fill:#ffd43b,stroke:#ff8c00,stroke-width:3px
```

## 2. Microservices Communication Diagram

```mermaid
graph LR
    Client["🌐 Client<br/>Mobile/Web"]

    Client -->|HTTP/REST| GW["🔗 NestJS Gateway<br/>Port 3000<br/>Authentication<br/>Rate Limiting<br/>Routing"]

    GW -->|Service Calls| AS["🔐 Auth Service<br/>Port 3001<br/>JWT<br/>Sessions<br/>OAuth"]
    GW -->|Service Calls| US["👥 User Service<br/>Port 3002<br/>Profiles<br/>Relationships<br/>Search"]
    GW -->|Service Calls| PS["📝 Post Service<br/>Port 3003<br/>CRUD<br/>Feed<br/>Search"]
    GW -->|Service Calls| CS["💬 Comment Service<br/>Port 3004<br/>Threading<br/>Replies<br/>Notifications"]
    GW -->|Service Calls| NS["🔔 Notification Service<br/>Port 3005<br/>Real-time<br/>Email/SMS<br/>Preferences"]
    GW -->|WebSocket| WS["⚡ WebSocket Gateway<br/>Port 3006<br/>Real-time<br/>Presence<br/>Streaming"]
    GW -->|Internal| SS["🔍 Search Service<br/>Port 3007<br/>Elasticsearch<br/>Aggregations"]

    AS --> PG["🗄️ PostgreSQL<br/>Primary<br/>Transactions"]
    US --> PG
    PS --> PG
    CS --> PG
    NS --> PG

    PG --> PR["🗄️ PostgreSQL<br/>Read Replica<br/>Analytics"]

    AS --> RC["💾 Redis Cache<br/>User Sessions<br/>Profiles<br/>Relationships"]
    US --> RC
    PS --> RC
    CS --> RC
    NS --> RC

    NS --> BQ["📤 Bull Queues<br/>Email Jobs<br/>SMS Jobs<br/>Digests"]

    SS --> ES["🔎 Elasticsearch<br/>Posts Index<br/>Users Index<br/>Comments Index"]

    PS --> ES
    CS --> ES

    WS --> RC
    RC -->|Pub/Sub| WS

    NS --> EML["✉️ Email Service<br/>SendGrid/<br/>AWS SES"]
    NS --> SMS["📱 SMS Service<br/>Twilio"]
    BQ --> EML
    BQ --> SMS

    style GW fill:#4dabf7,stroke:#0c3c9a,stroke-width:2px
    style AS fill:#a78bfa
    style US fill:#a78bfa
    style PS fill:#a78bfa
    style CS fill:#a78bfa
    style NS fill:#a78bfa
    style WS fill:#a78bfa
    style SS fill:#a78bfa
    style PG fill:#f8b500
    style PR fill:#f8b500
    style RC fill:#51cf66
    style BQ fill:#ff922b
    style ES fill:#ff6b9d
    style EML fill:#868e96
    style SMS fill:#868e96
```

## 3. Data Flow for User Request

```mermaid
sequenceDiagram
    participant Client as 🌐 Client
    participant Gateway as 🔗 Gateway
    participant Auth as 🔐 Auth
    participant User as 👥 User
    participant Cache as 💾 Redis
    participant DB as 🗄️ PostgreSQL

    Client->>Gateway: GET /api/users/123

    Gateway->>Gateway: ⏱️ Rate Limit Check
    Gateway->>Auth: Validate JWT Token
    Auth->>Cache: Check Session
    Cache-->>Auth: Session Valid ✓
    Auth-->>Gateway: Token Valid ✓

    Gateway->>User: GET /users/123

    User->>Cache: Get user:123:profile (TTL 30min)
    alt Cache Hit
        Cache-->>User: Profile Data ✅
        User-->>Gateway: Profile
    else Cache Miss
        Cache-->>User: Not Found
        User->>DB: SELECT * FROM users WHERE id=123
        DB-->>User: User Record
        User->>Cache: SET user:123:profile (30min TTL)
        User-->>Gateway: Profile
    end

    Gateway->>Gateway: Transform Response
    Gateway->>Gateway: Log Request
    Gateway->>Gateway: Record Metrics
    Gateway-->>Client: {status: 'success', data: {...}}

    alt Performance
        Note over Gateway,Client: <2ms (cache hit)<br/>50-100ms (DB hit)<br/>P95: <100ms
    end
```

## 4. Event-Driven Flow for Post Creation

```mermaid
graph TB
    User["👤 User<br/>Creates Post"]

    User -->|POST /api/posts| Gateway["🔗 Gateway"]
    Gateway -->|Forward| PostSvc["📝 Post Service"]

    PostSvc -->|1. Write| DB["🗄️ PostgreSQL<br/>INSERT post"]
    PostSvc -->|2. Invalidate| RC["💾 Redis<br/>FLUSHPAT feed:*"]

    DB -->|Return post_id| PostSvc
    PostSvc -->|3. Emit Event| Events["📢 Event Stream"]

    Events -->|Queue Job| BQ["📤 Bull Queue<br/>find_followers_notify"]
    Events -->|Index| ES["🔎 Elasticsearch<br/>posts index"]
    Events -->|Broadcast| WS["⚡ WebSocket<br/>post.created"]
    Events -->|Publish| Kafka["📊 Kafka<br/>events.posts"]

    BQ -->|Async| Email["✉️ Send Email<br/>notif to followers"]
    BQ -->|Async| SMS["📱 Send SMS<br/>important followers"]

    ES -->|Async| Analytics["📈 Analytics<br/>Log impression"]

    WS -->|Real-time| Followers["👯 Followers<br/>See post live"]

    Kafka -->|Stream| Recommendations["🤖 ML Pipeline<br/>Update recommendations"]

    PostSvc -->|Response| User

    style User fill:#a78bfa
    style PostSvc fill:#4dabf7
    style DB fill:#f8b500
    style RC fill:#51cf66
    style BQ fill:#ff922b
    style ES fill:#ff6b9d
    style WS fill:#22c55e
    style Email fill:#868e96
    style SMS fill:#868e96
    style Kafka fill:#8b5cf6
```

## 5. Technology Stack by Phase

```mermaid
graph LR
    subgraph Phase1["Phase 1 - Foundation"]
        Redis["Redis<br/>Caching"]
        RateLimit["rate-limiter<br/>-flexible"]
        Logger["Pino/Winston<br/>Logging"]
        Prometheus["Prometheus<br/>Metrics"]
    end

    subgraph Phase2["Phase 2 - Async"]
        Bull["Bull Queues<br/>Email/SMS"]
        Notif["Notification<br/>Service"]
    end

    subgraph Phase3["Phase 3 - Search"]
        ES["Elasticsearch<br/>Full-text"]
        Analytics["Analytics<br/>Aggregations"]
    end

    subgraph Phase4["Phase 4 - Patterns"]
        Circuit["Opossum<br/>Circuit Breaker"]
        Jaeger["Jaeger<br/>Tracing"]
    end

    subgraph Phase5["Phase 5 - Microservices ⭐"]
        NestJS["NestJS<br/>Framework"]
        Passport["Passport/JWT<br/>Auth"]
        Prisma["Prisma ORM<br/>Database"]
        Services["Auth/User/Post<br/>Services"]
    end

    subgraph Phase6["Phase 6 - Advanced"]
        gRPC["gRPC<br/>Performance"]
        Kafka["Kafka<br/>Events"]
    end

    subgraph Phase7["Phase 7 - DevOps"]
        K8s["Kubernetes<br/>Orchestration"]
        GHA["GitHub Actions<br/>CI/CD"]
    end

    Phase1 --> Phase2
    Phase2 --> Phase3
    Phase3 --> Phase4
    Phase4 --> Phase5
    Phase5 --> Phase6
    Phase6 --> Phase7

    style Phase1 fill:#ff6b6b
    style Phase2 fill:#ff922b
    style Phase3 fill:#ffd43b
    style Phase4 fill:#99e9f2
    style Phase5 fill:#51cf66,stroke:#ff8c00,stroke-width:3px
    style Phase6 fill:#a78bfa
    style Phase7 fill:#4dabf7
```

## 6. Deployment Architecture - Kubernetes

```mermaid
graph TB
    Internet["🌐 Internet"]
    IGW["⚡ Ingress Gateway<br/>LoadBalancer<br/>SSL/TLS"]
    SM["🔗 Service Mesh<br/>Istio<br/>Traffic Management"]

    PG["🗄️ PostgreSQL<br/>Primary RW"]
    PR["🗄️ PostgreSQL Read<br/>Replica RO"]
    RC["💾 Redis Cluster<br/>3+ Nodes"]
    ES["🔎 Elasticsearch<br/>Cluster<br/>3+ Nodes"]

    subgraph K8sCluster["☸️ Kubernetes Cluster"]
        GW["Auth<br/>Pod"]
        Auth["Auth<br/>Service"]
        User["User<br/>Service"]
        Post["Post<br/>Service"]
        Comment["Comment<br/>Service"]
        Notif["Notif<br/>Service"]
        WebS["WebSocket<br/>Service"]
        Search["Search<br/>Service"]

        HPA["HPA<br/>Auto-scale"]
        CM["ConfigMaps<br/>Config"]
        Sec["Secrets<br/>Credentials"]
        PV["PersistentVolumes<br/>Data"]
    end

    Monitor["📊 Monitoring<br/>Prometheus<br/>Grafana"]
    Logs["📋 Logging<br/>ELK/Loki"]
    Trace["🔍 Tracing<br/>Jaeger"]

    Internet --> IGW
    IGW --> SM
    SM --> K8sCluster

    K8sCluster --> PG
    K8sCluster --> PR
    K8sCluster --> RC
    K8sCluster --> ES

    K8sCluster -.-> Monitor
    K8sCluster -.-> Logs
    K8sCluster -.-> Trace

    HPA -.-> Auth
    HPA -.-> User
    HPA -.-> Post
    HPA -.-> Comment
    HPA -.-> Notif
    HPA -.-> WebS
    HPA -.-> Search

    style Internet fill:#e7f5ff
    style IGW fill:#0c3c9a
    style SM fill:#4dabf7
    style K8sCluster fill:#f0f0f0,stroke:#333,stroke-width:2px
    style PG fill:#f8b500
    style PR fill:#f8b500
    style RC fill:#51cf66
    style ES fill:#ff6b9d
    style Monitor fill:#a78bfa
    style Logs fill:#a78bfa
    style Trace fill:#a78bfa
```

## 7. NestJS Service Architecture

```mermaid
graph TB
    subgraph Module1["Auth Module"]
        AuthCtrl["AuthController"]
        AuthSvc["AuthService"]
        JWTStrat["JWTStrategy"]
        PassAuth["PassportAuth"]
    end

    subgraph Module2["User Module"]
        UserCtrl["UserController"]
        UserSvc["UserService"]
        UserDal["UserRepository"]
    end

    subgraph Module3["Post Module"]
        PostCtrl["PostController"]
        PostSvc["PostService"]
        PostDal["PostRepository"]
    end

    subgraph Common["Common Module"]
        HttpClient["HttpClientService"]
        Transform["TransformInterceptor"]
        ErrorFilter["ErrorFilter"]
        Validation["ValidationPipe"]
        RateLimit["RateLimitGuard"]
    end

    subgraph Root["App Module"]
        AppController["AppController"]
        AppService["AppService"]
    end

    Root --> Module1
    Root --> Module2
    Root --> Module3
    Root --> Common

    AuthCtrl --> PassAuth
    PassAuth --> JWTStrat
    JWTStrat --> AuthSvc

    UserCtrl --> Validation
    Validation --> UserSvc
    UserSvc --> UserDal

    PostCtrl --> RateLimit
    RateLimit --> PostSvc
    PostSvc --> PostDal

    Module1 --> Common
    Module2 --> Common
    Module3 --> Common

    style Module1 fill:#a78bfa,stroke:#7c3aed,stroke-width:2px
    style Module2 fill:#a78bfa,stroke:#7c3aed,stroke-width:2px
    style Module3 fill:#a78bfa,stroke:#7c3aed,stroke-width:2px
    style Common fill:#ddd6fe,stroke:#7c3aed,stroke-width:2px
    style Root fill:#4dabf7,stroke:#0c3c9a,stroke-width:2px
```

## 8. Request Lifecycle - Gateway to Service

```mermaid
graph LR
    REQ["1. Request<br/>Arrives"]
    RL["2. Rate Limiter<br/>Middleware"]
    AUTH["3. Authentication<br/>JWT Verify"]
    LOG["4. HTTP Logger<br/>Log Request"]
    CTL["5. Controller<br/>Route Handler"]
    SVC["6. Service<br/>Business Logic"]
    DB["7. Database<br/>Query"]
    CACHE["8. Cache<br/>Check/Update"]
    RESP["9. Transform<br/>Response"]
    MLOG["10. Metrics<br/>Record"]
    OUT["11. Response<br/>Sent"]

    REQ --> RL
    RL --> AUTH
    AUTH --> LOG
    LOG --> CTL
    CTL --> SVC
    SVC --> DB
    SVC --> CACHE
    DB --> RESP
    CACHE --> RESP
    RESP --> MLOG
    MLOG --> OUT

    RL -->|Rate limited| REJECT["429 Too Many<br/>Requests"]
    AUTH -->|Invalid| UNAUTH["401 Unauthorized"]

    style REQ fill:#e7f5ff
    style OUT fill:#d0fc66
    style REJECT fill:#ff6b6b
    style UNAUTH fill:#ff6b6b
    style SVC fill:#97e3f9
    style DB fill:#f8b500
    style CACHE fill:#51cf66
```

## 9. Technology Decision Tree - GraphQL vs REST

```mermaid
graph TD
    Q1["Need Flexible<br/>Queries?"]

    Q1 -->|YES| Q2["Multiple API<br/>Consumers?"]
    Q1 -->|NO| REST1["✅ Use REST"]

    Q2 -->|YES| Q3["Over-fetching<br/>Problem?"]
    Q2 -->|NO| REST2["✅ Use REST<br/>Single Consumer"]

    Q3 -->|YES| Q4["Budget for<br/>GraphQL?"]
    Q3 -->|NO| REST3["✅ REST Sufficient"]

    Q4 -->|YES| Q5["Web Clients<br/>Only?"]
    Q4 -->|NO| REST4["✅ Stick with REST"]

    Q5 -->|YES| GRAPH1["✅ Add GraphQL<br/>for Web<br/>Keep REST Mobile"]
    Q5 -->|NO| GRAPH2["✅ Full GraphQL<br/>Federation"]

    GRAPH1 --> DEV["Implementation<br/>Phase 5.8<br/>Optional"]
    GRAPH2 --> DEV

    style REST1 fill:#51cf66
    style REST2 fill:#51cf66
    style REST3 fill:#51cf66
    style REST4 fill:#51cf66
    style GRAPH1 fill:#ffd43b
    style GRAPH2 fill:#ffd43b
    style DEV fill:#a78bfa
```

## 10. Service Extraction Roadmap - Phase 5

```mermaid
timeline
    Week 9: Phase 5.1 Gateway Complete ✅
           : Phase 5.2 WebSocket Start

    Week 10: Phase 5.2 WebSocket Complete ✅
            : Phase 5.3 User Service Start
            : Phase 5.4 Post Service Start (Parallel)

    Week 11: Phase 5.3-5.4 Complete ✅
            : Phase 5.5 Comment Service Start
            : Phase 5.6 Notification Service Start (Parallel)

    Week 12: Phase 5.5-5.6 Complete ✅
            : Phase 5.7 Auth Service Start

    Week 13: Phase 5.7-5.8 Complete ✅
            : All Services Extracted ✅
            : NestJS Mastery Achieved ⭐
            : Ready for Phase 6
```

---

## Using These Diagrams

### 1. **In README**

Copy any diagram code and paste into your README.md with markdown-style code fence:

```markdown
\`\`\`mermaid
[diagram code here]
\`\`\`
```

### 2. **In Notion**

- Install Mermaid plugin
- Create embed block
- Paste code

### 3. **Generate Images**

- Use [mermaid.live](https://mermaid.live)
- Export as PNG/SVG
- Add to presentations

### 4. **For Team Communication**

- Share Mermaid URLs with team
- Discuss architecture visually
- Update as you progress

---

**Diagrams Generated:** 10
**Total Visualizations:** 30+
**Format:** Mermaid (GitHub-compatible)
**Last Updated:** April 13, 2026
