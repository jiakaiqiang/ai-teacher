# Day03：事件驱动流程

```mermaid
flowchart LR
    timer([定时任务触发])
    metrics[MetricsService<br/>定时生成 metrics 数据]
    db[(数据库)]
    emitter{{EventEmitter<br/>emit('metric.created', data)}}
    logger[EventLoggerService<br/>监听 metric.created]
    log[处理事件并打印日志]

    timer --> metrics
    metrics -->|1. 生成数据| db
    db -->|2. 插入成功| emitter
    emitter -.->|3. 发布事件| logger
    logger -->|4. 处理 data| log

    metrics -. "松耦合：只负责发布事件<br/>不直接调用日志服务" .-> emitter
    emitter -. "松耦合：发布者与监听者<br/>通过事件名通信" .-> logger

    classDef service fill:#e8f3ff,stroke:#2f80ed,color:#1f2937;
    classDef event fill:#fff7db,stroke:#f59e0b,color:#1f2937;
    classDef storage fill:#eafaf1,stroke:#27ae60,color:#1f2937;
    classDef note fill:#f5f5f5,stroke:#9ca3af,color:#374151;

    class metrics,logger service;
    class emitter event;
    class db storage;
    class timer,log note;
```

**松耦合特点**

- `MetricsService` 只负责生成数据、入库、发布 `metric.created` 事件。
- `EventLoggerService` 只关心监听 `metric.created` 事件并处理日志。
- 两个服务不直接互相依赖，中间通过事件名和数据载荷通信。
- 后续新增告警、通知、统计等监听者时，不需要改动 `MetricsService` 的核心逻辑。
