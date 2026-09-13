import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
  hasError: boolean;
  showDetails: boolean;
}

/**
 * Modern Error Boundary Component
 * Catches errors in child components and displays user-friendly Vietnamese fallback UI
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, hasError: false, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, hasError: true, showDetails: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);
  }

  reset = () => {
    this.setState({ error: null, hasError: false, showDetails: false });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
            {/* Warning Icon */}
            <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-5 ring-8 ring-red-50/50">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Đã có sự cố xảy ra
            </h2>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Trang web tạm thời không thể hiển thị nội dung này. Dữ liệu của bạn vẫn được an toàn. Vui lòng thử lại hoặc tải lại trang.
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={this.reset}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors duration-150"
              >
                Thử lại
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors duration-150"
              >
                Tải lại trang
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors duration-150"
              >
                Trang chủ
              </button>
            </div>

            {/* Technical details toggle */}
            {this.state.error && (
              <div className="text-left border-t border-gray-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto"
                >
                  <span>{this.state.showDetails ? 'Ẩn thông tin kỹ thuật' : 'Xem chi tiết kỹ thuật'}</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${this.state.showDetails ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {this.state.showDetails && (
                  <pre className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-red-600 overflow-x-auto whitespace-pre-wrap max-h-40 border border-gray-200 font-mono">
                    {this.state.error.message}
                    {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
