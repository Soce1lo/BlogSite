---
title: C语言编程题常用代码模板
description: 面向专业级 C 编程考试的可复用代码骨架，覆盖输入输出、常用算法、数据结构、内存安全和边界约定。
pubDate: '2026-07-09'
updatedDate: '2026-07-12'
draft: false
category: Programming
tags:
  - c
  - 算法
  - 编程考试
visibility: public
sourceVaultPath: 60-Publish/C语言编程题常用代码模板.md
managedBy: vault-sync
sourcePublishStatus: published
outputKind: learned
topic: C
---
# C语言编程题常用代码模板

## 使用原则

- 默认使用 C17，代码兼容绝大多数 C11 平台。
- 模板解决的是机械性工作，不能替代对数据范围、复杂度和所有权的判断。
- 下标区间默认采用半开区间 `[lo, hi)`；如果题目采用闭区间，必须在函数名或注释中明确。
- 数组容量、队列容量和图的边数应从题目上限推导，不凭经验随便开。
- 中间结果可能溢出时，先提升操作数类型，再进行运算。
- 比较器不要用 `return a - b;`，该表达式可能溢出。
- 模板应配合 C语言专业编程技巧清单 使用：保持函数小、控制流直、资源清理路径清楚。

## 最小机考骨架

```c
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include <string.h>
#include <limits.h>

int main(void)
{
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    /* solve */

    return 0;
}
```

如果平台要求精确宽度整数，输出时配合 `<inttypes.h>`：

```c
#include <inttypes.h>

int64_t answer = 0;
printf("%" PRId64 "\n", answer);
```

## 输入与解析

### 在线判题整数输入

```c
int n;
long long x;

if (scanf("%d%lld", &n, &x) != 2) {
    return 0;
}
```

`scanf` 适合格式固定、输入可信的机考。返回值是成功完成的转换数，不检查就继续使用变量可能读取未初始化值。

### 读取整行并去除换行

```c
static bool read_line(char *buf, size_t cap)
{
    if (cap == 0 || cap > INT_MAX) {
        return false;
    }
    if (fgets(buf, (int)cap, stdin) == NULL) {
        return false;
    }

    size_t len = strlen(buf);
    if (len > 0 && buf[len - 1] == '\n') {
        buf[len - 1] = '\0';
    } else {
        int ch;
        while ((ch = getchar()) != '\n' && ch != EOF) {
        }
    }
    return true;
}
```

### 使用 `strtol` 做显式解析

```c
#include <errno.h>

static bool parse_long(const char *text, long *out)
{
    char *end;

    errno = 0;
    long value = strtol(text, &end, 10);
    if (text == end || errno == ERANGE) {
        return false;
    }
    while (*end == ' ' || *end == '\t' || *end == '\n') {
        ++end;
    }
    if (*end != '\0') {
        return false;
    }

    *out = value;
    return true;
}
```

## 排序与选择

### `qsort` 整数比较器

```c
static int cmp_int_asc(const void *lhs, const void *rhs)
{
    int a = *(const int *)lhs;
    int b = *(const int *)rhs;
    return (a > b) - (a < b);
}

static int cmp_int_desc(const void *lhs, const void *rhs)
{
    int a = *(const int *)lhs;
    int b = *(const int *)rhs;
    return (b > a) - (b < a);
}

qsort(values, n, sizeof values[0], cmp_int_asc);
```

### 结构体多关键字排序

```c
struct Item {
    int score;
    int id;
};

static int cmp_item(const void *lhs, const void *rhs)
{
    const struct Item *a = lhs;
    const struct Item *b = rhs;

    if (a->score != b->score) {
        return (b->score > a->score) - (b->score < a->score);
    }
    return (a->id > b->id) - (a->id < b->id);
}
```

## 二分查找

### 第一个不小于 `target` 的位置

返回范围为 `[0, n]`，返回 `n` 表示不存在不小于目标的元素。

```c
static size_t lower_bound_int(const int *a, size_t n, int target)
{
    size_t lo = 0;
    size_t hi = n;

    while (lo < hi) {
        size_t mid = lo + (hi - lo) / 2;
        if (a[mid] < target) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}
```

### 第一个大于 `target` 的位置

```c
static size_t upper_bound_int(const int *a, size_t n, int target)
{
    size_t lo = 0;
    size_t hi = n;

    while (lo < hi) {
        size_t mid = lo + (hi - lo) / 2;
        if (a[mid] <= target) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}
```

有序数组中 `target` 的出现次数：

```c
size_t count = upper_bound_int(a, n, target)
             - lower_bound_int(a, n, target);
```

## 前缀和与差分

### 一维前缀和

`prefix[i]` 表示前 `i` 个元素之和，区间 `[l, r)` 的和为 `prefix[r] - prefix[l]`。

```c
if (n == SIZE_MAX) {
    return EXIT_FAILURE;
}

long long *prefix = calloc(n + 1, sizeof *prefix);
if (prefix == NULL) {
    return EXIT_FAILURE;
}

for (size_t i = 0; i < n; ++i) {
    prefix[i + 1] = prefix[i] + a[i];
}

long long range_sum = prefix[r] - prefix[l];
free(prefix);
```

### 一维差分

对闭区间 `[l, r]` 增加 `delta`：

```c
diff[l] += delta;
if (r + 1 < n) {
    diff[r + 1] -= delta;
}

for (size_t i = 1; i < n; ++i) {
    diff[i] += diff[i - 1];
}
```

## 双指针与滑动窗口

以下模板要求窗口内元素非负，否则“和过大就收缩”的单调性不成立。

```c
size_t left = 0;
long long sum = 0;
size_t best = 0;

for (size_t right = 0; right < n; ++right) {
    sum += a[right];

    while (left <= right && sum > limit) {
        sum -= a[left++];
    }

    size_t len = right - left + 1;
    if (len > best) {
        best = len;
    }
}
```

## 位运算

仅在 `x != 0` 时清除最低位的 `1`：

```c
x &= x - 1;
```

检查第 `k` 位，先保证 `k` 小于类型位宽：

```c
bool set = (x & (UINT64_C(1) << k)) != 0;
```

设置、清除、翻转第 `k` 位：

```c
x |=  UINT64_C(1) << k;
x &= ~(UINT64_C(1) << k);
x ^=  UINT64_C(1) << k;
```

不要对负的有符号整数做依赖具体表示的位技巧。需要位级语义时优先使用无符号类型。

## 单链表

```c
struct ListNode {
    int value;
    struct ListNode *next;
};

static struct ListNode *reverse_list(struct ListNode *head)
{
    struct ListNode *prev = NULL;

    while (head != NULL) {
        struct ListNode *next = head->next;
        head->next = prev;
        prev = head;
        head = next;
    }
    return prev;
}

static struct ListNode *middle_node(struct ListNode *head)
{
    struct ListNode *slow = head;
    struct ListNode *fast = head;

    while (fast != NULL && fast->next != NULL) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}
```

虚拟头结点适合统一“删除头结点”和“删除中间结点”：

```c
struct ListNode dummy = {.value = 0, .next = head};
struct ListNode *prev = &dummy;
```

## 栈

```c
struct IntStack {
    int *data;
    size_t size;
    size_t capacity;
};

static bool stack_push(struct IntStack *s, int value)
{
    if (s->size == s->capacity) {
        size_t new_cap = s->capacity == 0 ? 16 : s->capacity * 2;
        if (new_cap < s->capacity ||
            new_cap > SIZE_MAX / sizeof *s->data) {
            return false;
        }

        int *tmp = realloc(s->data, new_cap * sizeof *s->data);
        if (tmp == NULL) {
            return false;
        }
        s->data = tmp;
        s->capacity = new_cap;
    }

    s->data[s->size++] = value;
    return true;
}

static bool stack_pop(struct IntStack *s, int *out)
{
    if (s->size == 0) {
        return false;
    }
    *out = s->data[--s->size];
    return true;
}
```

## 固定容量循环队列

使用 `size` 区分空和满，避免仅靠 `head == tail` 产生歧义。

```c
enum { QUEUE_CAP = 100000 };

struct IntQueue {
    int data[QUEUE_CAP];
    size_t head;
    size_t tail;
    size_t size;
};

static bool queue_push(struct IntQueue *q, int value)
{
    if (q->size == QUEUE_CAP) {
        return false;
    }
    q->data[q->tail] = value;
    q->tail = (q->tail + 1) % QUEUE_CAP;
    ++q->size;
    return true;
}

static bool queue_pop(struct IntQueue *q, int *out)
{
    if (q->size == 0) {
        return false;
    }
    *out = q->data[q->head];
    q->head = (q->head + 1) % QUEUE_CAP;
    --q->size;
    return true;
}
```

## 最小堆

```c
struct MinHeap {
    int *data;
    size_t size;
    size_t capacity;
};

static void swap_int(int *a, int *b)
{
    int tmp = *a;
    *a = *b;
    *b = tmp;
}

static bool heap_push(struct MinHeap *h, int value)
{
    if (h->size == h->capacity) {
        size_t new_cap = h->capacity == 0 ? 16 : h->capacity * 2;
        if (new_cap < h->capacity ||
            new_cap > SIZE_MAX / sizeof *h->data) {
            return false;
        }
        int *tmp = realloc(h->data, new_cap * sizeof *h->data);
        if (tmp == NULL) {
            return false;
        }
        h->data = tmp;
        h->capacity = new_cap;
    }

    size_t i = h->size++;
    h->data[i] = value;
    while (i > 0) {
        size_t parent = (i - 1) / 2;
        if (h->data[parent] <= h->data[i]) {
            break;
        }
        swap_int(&h->data[parent], &h->data[i]);
        i = parent;
    }
    return true;
}

static bool heap_pop(struct MinHeap *h, int *out)
{
    if (h->size == 0) {
        return false;
    }

    *out = h->data[0];
    h->data[0] = h->data[--h->size];

    size_t i = 0;
    for (;;) {
        size_t left = 2 * i + 1;
        size_t right = left + 1;
        size_t smallest = i;

        if (left < h->size && h->data[left] < h->data[smallest]) {
            smallest = left;
        }
        if (right < h->size && h->data[right] < h->data[smallest]) {
            smallest = right;
        }
        if (smallest == i) {
            break;
        }
        swap_int(&h->data[i], &h->data[smallest]);
        i = smallest;
    }
    return true;
}
```

## 并查集

路径压缩配合按大小合并，均摊复杂度接近常数。

```c
struct Dsu {
    int *parent;
    int *size;
};

static int dsu_find(struct Dsu *d, int x)
{
    int root = x;
    while (d->parent[root] != root) {
        root = d->parent[root];
    }
    while (d->parent[x] != x) {
        int next = d->parent[x];
        d->parent[x] = root;
        x = next;
    }
    return root;
}

static bool dsu_union(struct Dsu *d, int a, int b)
{
    int ra = dsu_find(d, a);
    int rb = dsu_find(d, b);

    if (ra == rb) {
        return false;
    }
    if (d->size[ra] < d->size[rb]) {
        int tmp = ra;
        ra = rb;
        rb = tmp;
    }
    d->parent[rb] = ra;
    d->size[ra] += d->size[rb];
    return true;
}
```

初始化：

```c
for (int i = 0; i < n; ++i) {
    d.parent[i] = i;
    d.size[i] = 1;
}
```

## 图的前向星邻接表

适合已知最大顶点数和边数的机考环境。

```c
enum {
    MAX_V = 100000,
    MAX_E = 200000
};

struct Edge {
    int to;
    int next;
    int weight;
};

static int head[MAX_V];
static struct Edge edges[MAX_E];
static int edge_count;

static void graph_init(int vertex_count)
{
    for (int i = 0; i < vertex_count; ++i) {
        head[i] = -1;
    }
    edge_count = 0;
}

static bool add_edge(int from, int to, int weight)
{
    if (edge_count == MAX_E) {
        return false;
    }
    edges[edge_count] = (struct Edge){
        .to = to,
        .next = head[from],
        .weight = weight
    };
    head[from] = edge_count++;
    return true;
}
```

无向图需要添加两条有向边，并把 `MAX_E` 设为题目边数上限的两倍。

## BFS

应在入队时标记，避免同一节点重复入队导致队列膨胀。

```c
static int dist[MAX_V];
static int queue_data[MAX_V];

static void bfs(int start, int vertex_count)
{
    for (int i = 0; i < vertex_count; ++i) {
        dist[i] = -1;
    }

    size_t front = 0;
    size_t back = 0;
    dist[start] = 0;
    queue_data[back++] = start;

    while (front < back) {
        int u = queue_data[front++];
        for (int e = head[u]; e != -1; e = edges[e].next) {
            int v = edges[e].to;
            if (dist[v] != -1) {
                continue;
            }
            dist[v] = dist[u] + 1;
            queue_data[back++] = v;
        }
    }
}
```

## DFS

递归版本简洁，但链式图可能超过调用栈。规模较大时改用显式栈。

```c
static bool visited[MAX_V];

static void dfs(int u)
{
    visited[u] = true;
    for (int e = head[u]; e != -1; e = edges[e].next) {
        int v = edges[e].to;
        if (!visited[v]) {
            dfs(v);
        }
    }
}
```

## Dijkstra

以下实现复用前面的邻接表。堆中允许存在同一顶点的旧距离，弹出后用当前最短距离跳过陈旧项，从而不需要 decrease-key。

```c
struct DistNode {
    long long distance;
    int vertex;
};

struct DistHeap {
    struct DistNode *data;
    size_t size;
    size_t capacity;
};

static void swap_dist_node(struct DistNode *a, struct DistNode *b)
{
    struct DistNode tmp = *a;
    *a = *b;
    *b = tmp;
}

static bool dist_heap_push(struct DistHeap *h, struct DistNode value)
{
    if (h->size == h->capacity) {
        size_t new_cap = h->capacity == 0 ? 16 : h->capacity * 2;
        if (new_cap < h->capacity ||
            new_cap > SIZE_MAX / sizeof *h->data) {
            return false;
        }

        struct DistNode *tmp =
            realloc(h->data, new_cap * sizeof *h->data);
        if (tmp == NULL) {
            return false;
        }
        h->data = tmp;
        h->capacity = new_cap;
    }

    size_t i = h->size++;
    h->data[i] = value;
    while (i > 0) {
        size_t parent = (i - 1) / 2;
        if (h->data[parent].distance <= h->data[i].distance) {
            break;
        }
        swap_dist_node(&h->data[parent], &h->data[i]);
        i = parent;
    }
    return true;
}

static bool dist_heap_pop(struct DistHeap *h, struct DistNode *out)
{
    if (h->size == 0) {
        return false;
    }

    *out = h->data[0];
    h->data[0] = h->data[--h->size];

    size_t i = 0;
    for (;;) {
        size_t left = 2 * i + 1;
        size_t right = left + 1;
        size_t smallest = i;

        if (left < h->size &&
            h->data[left].distance < h->data[smallest].distance) {
            smallest = left;
        }
        if (right < h->size &&
            h->data[right].distance < h->data[smallest].distance) {
            smallest = right;
        }
        if (smallest == i) {
            break;
        }
        swap_dist_node(&h->data[i], &h->data[smallest]);
        i = smallest;
    }
    return true;
}

static long long shortest[MAX_V];

static bool dijkstra(int source, int vertex_count)
{
    struct DistHeap heap = {0};

    for (int i = 0; i < vertex_count; ++i) {
        shortest[i] = LLONG_MAX;
    }
    shortest[source] = 0;

    if (!dist_heap_push(&heap, (struct DistNode){
            .distance = 0,
            .vertex = source
        })) {
        return false;
    }

    struct DistNode current;
    while (dist_heap_pop(&heap, &current)) {
        int u = current.vertex;
        if (current.distance != shortest[u]) {
            continue;
        }

        for (int e = head[u]; e != -1; e = edges[e].next) {
            int v = edges[e].to;
            int weight = edges[e].weight;

            if (weight < 0) {
                free(heap.data);
                return false;
            }
            if (shortest[u] <= LLONG_MAX - weight) {
                long long candidate = shortest[u] + weight;
                if (candidate < shortest[v]) {
                    shortest[v] = candidate;
                    if (!dist_heap_push(&heap, (struct DistNode){
                            .distance = candidate,
                            .vertex = v
                        })) {
                        free(heap.data);
                        return false;
                    }
                }
            }
        }
    }

    free(heap.data);
    return true;
}
```

Dijkstra 不适用于负权边。只有边权均为 `1` 时才直接用普通 BFS；边权为 `0/1` 时使用双端队列的 0-1 BFS。该模板最坏情况下会向堆加入 `O(E)` 个元素，复杂度为 `O((V + E) log E)`。

## 动态规划滚动数组

以 0/1 背包为例，容量必须倒序遍历，否则同一物品会在本轮被重复使用。

```c
for (size_t i = 0; i < item_count; ++i) {
    int w = weight[i];
    long long val = value[i];

    for (int cap = capacity; cap >= w; --cap) {
        long long candidate = dp[cap - w] + val;
        if (candidate > dp[cap]) {
            dp[cap] = candidate;
        }
    }
}
```

完全背包通常正序遍历容量。写代码前先明确“本轮状态能否使用本轮已经更新的值”。

## 动态内存安全模板

### 检查乘法后分配

```c
static void *alloc_array(size_t count, size_t elem_size)
{
    if (elem_size != 0 && count > SIZE_MAX / elem_size) {
        return NULL;
    }
    return malloc(count * elem_size);
}

int *values = alloc_array(n, sizeof *values);
if (values == NULL && n != 0) {
    return EXIT_FAILURE;
}
```

### 保留原指针的 `realloc`

```c
int *tmp = realloc(values, new_count * sizeof *values);
if (tmp == NULL && new_count != 0) {
    /* values 仍然有效 */
    free(values);
    return EXIT_FAILURE;
}
values = tmp;
```

如果 `new_count * sizeof *values` 可能溢出，必须先做乘法检查。

### 统一清理路径

```c
int rc = EXIT_FAILURE;
int *a = NULL;
long long *prefix = NULL;

if (n > SIZE_MAX / sizeof *a) {
    goto cleanup;
}
a = malloc(n * sizeof *a);
if (a == NULL && n != 0) {
    goto cleanup;
}

if (n == SIZE_MAX) {
    goto cleanup;
}
prefix = calloc(n + 1, sizeof *prefix);
if (prefix == NULL) {
    goto cleanup;
}

/* solve */
rc = EXIT_SUCCESS;

cleanup:
free(prefix);
free(a);
return rc;
```

在 C 中，单一清理出口常比多层嵌套更容易保证资源释放完整。`goto cleanup` 不是任意跳转的许可，而是资源所有权管理手段。

## 字符分类函数的参数

`isdigit`、`isspace` 等函数只接受 `EOF` 或可表示为 `unsigned char` 的值：

```c
#include <ctype.h>

unsigned char ch = (unsigned char)text[i];
if (isdigit(ch)) {
    /* ... */
}
```

直接把负的 `char` 传入可能产生未定义行为。

## 常见失分点

- `mid = (lo + hi) / 2` 在大下标下可能溢出；使用 `lo + (hi - lo) / 2`。
- `qsort` 比较器返回差值导致有符号溢出。
- `sizeof(ptr) / sizeof(ptr[0])` 只能用于真正的数组对象，不能用于指针形参。
- `memset(a, 1, sizeof a)` 得到的是每字节 `0x01`，通常不是整数数组中的值 `1`。
- `memset` 不能可移植地生成任意整数或浮点哨兵。
- `scanf("%s", buf)` 没有限制宽度，可能越界；宽度还必须为缓冲区容量减一。
- 将 `getchar()` 返回值存入 `char` 后再与 `EOF` 比较。
- 对 `malloc(0)`、`realloc(p, 0)` 的结果做不必要的可移植性假设。
- 使用 VLA 后忽略栈空间风险，或默认所有平台都支持 VLA。
- 递归 DFS 在深图上栈溢出。
- 将顶点标记放在 BFS 出队时，导致大量重复入队。
- 0/1 背包正序更新，意外变成完全背包。
- 用 `int` 保存数量乘积、距离和、前缀和或组合计数。
- 释放后继续使用指针；把指针设为 `NULL` 只能保护这一个别名。

## 相关笔记

- C语言专业级基础知识汇总
- C语言专业编程技巧清单
- C语言专业级编程考试复习
- 数组
- 链表
- 栈与队列
- 图论
- 动态规划
- KMP
