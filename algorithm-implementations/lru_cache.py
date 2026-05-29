"""
LRU (Least Recently Used) Cache — implemented from scratch with no libraries.

Uses a doubly-linked list + hash map for O(1) get and put.
"""


class _Node:
    """Doubly-linked list node."""
    __slots__ = ("key", "value", "prev", "next")

    def __init__(self, key, value):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    """
    LRU Cache with O(1) get/put.

    Usage:
        cache = LRUCache(capacity=3)
        cache.put(1, "a")
        cache.get(1)       # -> "a"
        cache.put(4, "d")  # evicts key 2 if capacity exceeded
    """

    def __init__(self, capacity: int):
        if capacity <= 0:
            raise ValueError("capacity must be > 0")
        self.capacity = capacity
        self._map: dict[int | str, _Node] = {}  # key -> Node

        # Sentinel head/tail to avoid None checks
        self._head = _Node(None, None)  # LRU end
        self._tail = _Node(None, None)  # MRU end
        self._head.next = self._tail
        self._tail.prev = self._head
        self._size = 0

    # ---- linked-list helpers (O(1)) ----

    def _detach(self, node: _Node):
        """Remove node from its current position."""
        node.prev.next = node.next
        node.next.prev = node.prev

    def _append_mru(self, node: _Node):
        """Insert node right before the tail sentinel (most-recent position)."""
        node.prev = self._tail.prev
        node.next = self._tail
        self._tail.prev.next = node
        self._tail.prev = node

    # ---- public API ----

    def get(self, key) -> object | None:
        """Return value if key exists (marks as most-recent), else None."""
        if key not in self._map:
            return None
        node = self._map[key]
        self._detach(node)
        self._append_mru(node)
        return node.value

    def put(self, key, value):
        """Insert or update key; evict LRU if at capacity."""
        if key in self._map:
            node = self._map[key]
            node.value = value
            self._detach(node)
            self._append_mru(node)
            return

        if self._size == self.capacity:
            # Evict the least-recently-used node (right after head)
            evict = self._head.next
            self._detach(evict)
            del self._map[evict.key]
            self._size -= 1

        node = _Node(key, value)
        self._map[key] = node
        self._append_mru(node)
        self._size += 1

    def __len__(self):
        return self._size

    def __repr__(self):
        items = [(n.key, n.value) for n in _iter_nodes(self._head)]
        return f"LRUCache(capacity={self.capacity}, {items})"


def _iter_nodes(head: _Node):
    """Yield nodes from head.next up to (but not including) the tail sentinel."""
    current = head.next
    while current and current != head.next.__class__(None, None).prev:  # safety
        yield current
        current = current.next


# ---- quick smoke test ----
if __name__ == "__main__":
    cache = LRUCache(3)
    cache.put(1, "a")
    cache.put(2, "b")
    cache.put(3, "c")
    print(cache)  # LRUCache(capacity=3, [(1, 'a'), (2, 'b'), (3, 'c')])

    assert cache.get(1) == "a"  # 1 becomes MRU
    print(cache)  # [(2, 'b'), (3, 'c'), (1, 'a')]

    cache.put(4, "d")  # evicts 2 (LRU)
    print(cache)  # [(3, 'c'), (1, 'a'), (4, 'd')]

    assert cache.get(2) is None  # evicted
    assert cache.get(3) == "c"
    assert cache.get(4) == "d"
    assert cache.get(1) == "a"

    cache.put(5, "e")  # evicts 3
    assert cache.get(3) is None
    assert cache.get(4) == "d"
    assert cache.get(1) == "a"
    assert cache.get(5) == "e"

    print("All LRU cache tests passed.")
