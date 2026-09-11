def run_kruskal(graph, edges_input=None):
    animation_steps = []
    
    vertices = set()
    edge_list = []
    
    if edges_input:
        for e in edges_input:
            u, v = e.get("u") or e.get("source"), e.get("v") or e.get("target")
            w = int(e.get("weight", 1))
            vertices.add(u)
            vertices.add(v)
            edge_list.append((min(u, v), max(u, v), w))
    elif isinstance(graph, dict):
        seen_edges = set()
        for u, neighbors in graph.items():
            vertices.add(u)
            if isinstance(neighbors, dict):
                for v, w in neighbors.items():
                    vertices.add(v)
                    edge_key = (min(u, v), max(u, v))
                    if edge_key not in seen_edges:
                        seen_edges.add(edge_key)
                        edge_list.append((min(u, v), max(u, v), int(w)))
            elif isinstance(neighbors, list):
                for item in neighbors:
                    if isinstance(item, dict):
                        v = item.get("node")
                        w = int(item.get("weight", 1))
                    elif isinstance(item, (list, tuple)) and len(item) >= 2:
                        v, w = item[0], int(item[1])
                    else:
                        v, w = str(item), 1
                    vertices.add(v)
                    edge_key = (min(u, v), max(u, v))
                    if edge_key not in seen_edges:
                        seen_edges.add(edge_key)
                        edge_list.append((min(u, v), max(u, v), w))

    sorted_vertices = sorted(list(vertices))
    
    parent = {v: v for v in sorted_vertices}
    rank = {v: 0 for v in sorted_vertices}
    
    def find(i):
        if parent[i] == i:
            return i
        parent[i] = find(parent[i])
        return parent[i]
        
    def union(i, j):
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            if rank[root_i] < rank[root_j]:
                parent[root_i] = root_j
            elif rank[root_i] > rank[root_j]:
                parent[root_j] = root_i
            else:
                parent[root_j] = root_i
                rank[root_i] += 1
            return True
        return False

    def get_disjoint_sets():
        groups = {}
        for v in sorted_vertices:
            root = find(v)
            if root not in groups:
                groups[root] = []
            groups[root].append(v)
        return [sorted(members) for root, members in sorted(groups.items())]

    mst_edges = []
    rejected_edges = []
    total_weight = 0

    animation_steps.append({
        "action": "init",
        "line": 3,
        "sets": get_disjoint_sets(),
        "mst_edges": [],
        "rejected_edges": [],
        "total_weight": 0,
    })

    sorted_edges = sorted(edge_list, key=lambda x: (x[2], x[0], x[1]))

    animation_steps.append({
        "action": "sort_edges",
        "line": 4,
        "sorted_edges": [{"u": u, "v": v, "weight": w} for u, v, w in sorted_edges],
        "sets": get_disjoint_sets(),
        "mst_edges": [],
        "rejected_edges": [],
        "total_weight": 0,
    })

    for u, v, weight in sorted_edges:
        root_u = find(u)
        root_v = find(v)

        animation_steps.append({
            "action": "check_edge",
            "u": u,
            "v": v,
            "weight": weight,
            "line": 6,
            "sets": get_disjoint_sets(),
            "mst_edges": list(mst_edges),
            "rejected_edges": list(rejected_edges),
            "total_weight": total_weight,
        })

        if root_u != root_v:
            mst_edges.append({"u": u, "v": v, "weight": weight})
            total_weight += weight
            
            animation_steps.append({
                "action": "add_to_mst",
                "u": u,
                "v": v,
                "weight": weight,
                "line": 7,
                "sets": get_disjoint_sets(),
                "mst_edges": list(mst_edges),
                "rejected_edges": list(rejected_edges),
                "total_weight": total_weight,
            })

            union(u, v)

            animation_steps.append({
                "action": "union",
                "u": u,
                "v": v,
                "line": 8,
                "sets": get_disjoint_sets(),
                "mst_edges": list(mst_edges),
                "rejected_edges": list(rejected_edges),
                "total_weight": total_weight,
            })
        else:
            rejected_edges.append({"u": min(u, v), "v": max(u, v), "weight": weight})
            animation_steps.append({
                "action": "skip_edge",
                "u": u,
                "v": v,
                "weight": weight,
                "line": 6,
                "reason": "cycle",
                "sets": get_disjoint_sets(),
                "mst_edges": list(mst_edges),
                "rejected_edges": list(rejected_edges),
                "total_weight": total_weight,
            })

    animation_steps.append({
        "action": "finish",
        "line": 9,
        "sets": get_disjoint_sets(),
        "mst_edges": list(mst_edges),
        "rejected_edges": list(rejected_edges),
        "total_weight": total_weight,
    })

    return animation_steps