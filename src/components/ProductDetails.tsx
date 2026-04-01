import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, MessageSquare, Send, User } from 'lucide-react';
import { Product, Review } from '../types';
import { cn } from '../lib/utils';

interface ProductDetailsProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onAddReview: (productId: string, review: Omit<Review, 'id' | 'date'>) => void;
}

export default function ProductDetails({ product, onClose, onAddToCart, onAddReview }: ProductDetailsProps) {
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    // Simulate API delay
    setTimeout(() => {
      onAddReview(product.id, {
        userName: 'You',
        rating: newRating,
        comment: newComment,
      });
      setNewComment('');
      setNewRating(5);
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-4xl bg-brand-cream rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full transition-colors shadow-sm"
        >
          <X size={20} />
        </button>

        {/* Image Section */}
        <div className="md:w-1/2 h-64 md:h-auto relative">
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent text-white">
            <span className="bg-brand-olive px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
              {product.category}
            </span>
            <h2 className="text-3xl font-serif font-bold">{product.name}</h2>
          </div>
        </div>

        {/* Content Section */}
        <div className="md:w-1/2 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {/* Info */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-brand-ink">{product.rating.toFixed(1)}</span>
                  <span className="text-xs text-brand-ink/40">({product.reviews.length} reviews)</span>
                </div>
                <span className="text-2xl font-bold text-brand-olive">${product.price.toFixed(2)} / {product.unit}</span>
              </div>
              <p className="text-brand-ink/70 leading-relaxed mb-6">
                {product.description}
              </p>
              <div className="bg-white rounded-2xl p-4 border border-brand-ink/5 flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-cream rounded-full flex items-center justify-center text-brand-olive">
                  <User size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-ink/40 uppercase tracking-widest">Farmer</p>
                  <p className="font-serif font-bold text-brand-ink">{product.farmerName}</p>
                  <p className="text-xs text-brand-ink/60">{product.farmLocation}</p>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-brand-ink/10 pb-4">
                <MessageSquare size={20} className="text-brand-olive" />
                <h3 className="text-lg font-serif font-bold">Customer Reviews</h3>
              </div>

              {/* Review List */}
              <div className="space-y-4">
                {product.reviews.length === 0 ? (
                  <p className="text-sm text-brand-ink/40 italic text-center py-4">No reviews yet. Be the first to share your thoughts!</p>
                ) : (
                  product.reviews.map(review => (
                    <div key={review.id} className="bg-white rounded-2xl p-4 border border-brand-ink/5">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm">{review.userName}</span>
                        <span className="text-[10px] text-brand-ink/40">{review.date}</span>
                      </div>
                      <div className="flex text-amber-400 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} fill={i < review.rating ? 'currentColor' : 'none'} />
                        ))}
                      </div>
                      <p className="text-sm text-brand-ink/70">{review.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Review Form */}
              <div className="bg-brand-cream border border-brand-olive/10 rounded-2xl p-6">
                <h4 className="text-sm font-bold text-brand-ink mb-4">Write a Review</h4>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-brand-ink/60">Your Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className={cn(
                            "transition-colors",
                            newRating >= star ? "text-amber-400" : "text-brand-ink/20"
                          )}
                        >
                          <Star size={20} fill={newRating >= star ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your experience with this product..."
                      className="w-full bg-white border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-olive/20 min-h-[100px] resize-none"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !newComment.trim()}
                      className="absolute bottom-3 right-3 p-2 bg-brand-olive text-white rounded-lg hover:bg-brand-olive/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? <Star size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-8 bg-white border-t border-brand-ink/10">
            <button 
              onClick={() => { onAddToCart(product); onClose(); }}
              className="w-full py-4 bg-brand-olive text-white rounded-2xl font-bold text-lg hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20 flex items-center justify-center gap-2"
            >
              Add to Basket • ${(product.price).toFixed(2)}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
