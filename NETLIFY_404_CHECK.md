# formant_synthesize 404 の確認チェックリスト

## 404 が続くとき（最優先でやること）

1. **Netlify** → 対象サイト → **Site configuration** → **Build & deploy** → **Build settings**
2. **Base directory**
   - GitHub のリポジトリで **このプロジェクトが `netlify` というフォルダの中に入っている**（親フォルダがある）→ **`netlify`** と入力して保存。
   - リポジトリのルートがこのプロジェクトだけ（中身が netlify.toml や index.html から始まる）→ **空のまま**でよい。
3. **Functions directory**（Build settings の「Functions」または「Advanced」内）
   - **`netlify/functions`** と明示して保存。未設定のままでも netlify.toml の値が使われますが、UI で別の値になっていると 404 の原因になります。
4. **Clear cache and deploy site** で再デプロイする。
5. **Deploys** → 最新のデプロイ → **Deploy log** を開き、`Packaging Functions` や `formant_synthesize` が出ているか確認。
6. **Functions** タブを開き、一覧に **formant_synthesize** があるか確認。なければビルドログに Python のエラーがないか確認。

---

## 1. 確認結果（ローカルで判明していること）

### リポジトリのルート
- **結論: リポジトリのルートは `netlify` フォルダそのものです**（`/home/sumino/netlify`）。
- そのため、Netlify で **Base directory は空のまま**（デフォルト＝リポジトリルート）で正しく、`netlify.toml` と `netlify/functions` の位置は合っています。

---

## 2. Netlify ダッシュボードで確認すること

### 2-1. Base directory の値
1. [Netlify](https://app.netlify.com/) にログインする。
2. 対象サイト（例: transparent-answer）を開く。
3. **Site configuration** → **Build & deploy** → **Build settings** を開く。
4. **Base directory** を確認する。
   - **空欄（または未設定）** → このリポジトリ構成では正しい。このままでよい。
   - **何か値が入っている**（例: `netlify` や `src`）→ このリポジトリでは不要な可能性が高い。**空にして保存**し、再デプロイする。

### 2-2. Functions タブで formant_synthesize が出ているか
1. 同じサイトで **Functions** タブを開く。
2. 一覧に **formant_synthesize** があるか確認する。
   - **ある** → 関数はデプロイされている。404 の原因は別（URL やリダイレクトなど）を疑う。
   - **ない** → 関数がビルド・デプロイされていない。**Deploys** タブで直近のビルドログを開き、Functions のビルドエラーや Python のエラーがないか確認する。

---

## 3. 方法1（Base directory を合わせる）について

- リポジトリルートが **netlify フォルダ** なので、通常は **Base directory を空** にしておけば十分です。
- もし Netlify に接続しているのが **このリポジトリの親**（例: `netlify` がサブフォルダのリポジトリ）の場合は、**Base directory に `netlify` を指定**すると、ビルドの起点が `netlify` になり、`netlify.toml` と `netlify/functions` が正しく解釈されます。

**今回の確認結果では「リポジトリルート = netlify フォルダ」なので、まずは Base directory を空のままにし、上記 2-1 / 2-2 を確認してください。**

---

## 4. 再デプロイ後の確認

- Base directory を変更した場合や、ビルド設定を変えた場合は **Trigger deploy** で再デプロイする。
- デプロイ完了後、もう一度 **Functions** タブで `formant_synthesize` が一覧に出ているか確認する。
- サイト上で `/.netlify/functions/formant_synthesize` を呼び直し、404 が解消しているか確認する。

---

## 5. まだ 404 の場合に確認するもの

- **Deploys** → 最新のデプロイ → **Build log**: Python / Functions のエラーがないか。
- **Functions** → **formant_synthesize** → **Logs**: 実行時エラーがないか。
- フロントの呼び出し URL が `/.netlify/functions/formant_synthesize` になっているか（`index.html` の `formant` の URL 設定）。
