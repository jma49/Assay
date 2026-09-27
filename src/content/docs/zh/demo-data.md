# 演示数据

没有自己的数据也能试用 Assay。种子脚本会在 `DATABASE_URL` 里创建一个 `demo` schema（客户、订单、付款、库存，其中埋了一些数据问题），并在 MongoDB 里创建 11 个能找出这些问题的检查。

```bash
npm run seed:demo
```

它只会改动 `demo` schema 和作者为 `demo-seed` 的检查，可以放心重复运行，每次都会重置它们。

想马上看到执行历史，就把所有检查执行一遍：

```bash
DOTENV_CONFIG_PATH=.env.local npm run sql:run-all
```

## 另见

- [快速开始](/docs/quick-start)
